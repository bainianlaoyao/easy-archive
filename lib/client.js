window.__ModuleLoader__.load({
	id: "easy-archive",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/**
		 * easy-archive — browser half.
		 *
		 * Moves session archiving out of the kebab (secondary) menu onto the row
		 * itself, as a two-step inline button:
		 *
		 *   1. click → the button switches to a red "confirm archive" pill;
		 *   2. click again → the session is archived through the workspaces service.
		 *
		 * The archive entry is simultaneously removed from the kebab menu whenever
		 * it opens, so archiving lives only on the row.
		 *
		 * How it works (no React, no slot takeover — the stock workspace browser
		 * keeps rendering): the plugin observes the sidebar DOM and, for every
		 * rendered session row, stamps the row with its session id (matched
		 * exactly from the sessions snapshot store by display title,
		 * disambiguated by the rendered relative-time bucket on duplicate titles)
		 * and inserts a small archive button into the row's trailing action cell,
		 * before the kebab. Clicking the button never bubbles to the row's "open
		 * session" handler.
		 *
		 * Services: `sessions` (ctx.sessions.list snapshot) and `workspaces`
		 * (ctx.workspaces.list snapshot + ctx.workspaces.archiveSession).
		 */

		const PLUGIN_ID = "easy-archive";
		const CSS_TAG = "easy-archive/ArchiveButton.module.css";
		// Session rows carry `aria-selected`; workspace group headers carry `aria-expanded` instead.
		const ROW_SELECTOR = 'div[role="treeitem"][aria-selected]';

		/** Small locale-aware copy (the GUI follows `document.documentElement.lang`). */
		const DICTS = {
			zh: {
				archiveAria: "归档会话",
				confirmAria: "确认归档",
				confirmText: "确认归档",
				menuArchive: ["归档会话"],
				time: {
					now: "刚刚",
					minutes: (n) => `${n}分钟`,
					hours: (n) => `${n}小时`,
					days: (n) => `${n}天`,
					months: (n) => `${n}个月`,
					years: (n) => `${n}年`
				}
			},
			en: {
				archiveAria: "Archive session",
				confirmAria: "Confirm archive",
				confirmText: "Confirm",
				menuArchive: ["Archive session"],
				time: {
					now: "now",
					minutes: (n) => `${n}min`,
					hours: (n) => `${n}h`,
					days: (n) => `${n}d`,
					months: (n) => `${n}mo`,
					years: (n) => `${n}y`
				}
			}
		};

		function currentLang() {
			return String(document.documentElement.lang ?? "zh-CN").toLowerCase().startsWith("zh") ? "zh" : "en";
		}

		/** Archive-bucket icon (box with a down arrow), same visual weight as the built-in 16px row icons. */
		const ARCHIVE_ICON =
			'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
			'<path d="M2.5 3.25A1.75 1.75 0 0 1 4.25 1.5h7.5a1.75 1.75 0 0 1 1.75 1.75v.6a1 1 0 0 1-.3.7l-1.2 1.2v5.9A1.75 1.75 0 0 1 10.25 13h-4.5a1.75 1.75 0 0 1-1.75-1.75V5.35l-1.2-1.2a1 1 0 0 1-.3-.7v-.6Z" stroke="currentColor" stroke-width="1.2"/>' +
			'<path d="M5.4 8.9 8 6.3l2.6 2.6M8 6.3V11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
			"</svg>";

		/** Check glyph for the armed confirm state. */
		const CHECK_ICON =
			'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
			'<path d="M3 8.6 6.4 12 13 4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
			"</svg>";

		/** Replicate the workspace browser's relative-time buckets for label-exact disambiguation. */
		function timeBucket(updatedAt, now) {
			const MIN = 6e4;
			const HOUR = 36e5;
			const DAY = 864e5;
			const diff = Math.max(0, now - updatedAt);
			if (diff < MIN) return { unit: "now", n: 0 };
			if (diff < HOUR) return { unit: "minutes", n: Math.floor(diff / MIN) };
			if (diff < DAY) return { unit: "hours", n: Math.floor(diff / HOUR) };
			if (diff < 30 * DAY) return { unit: "days", n: Math.floor(diff / DAY) };
			if (diff < 365 * DAY) return { unit: "months", n: Math.floor(diff / (30 * DAY)) };
			return { unit: "years", n: Math.floor(diff / (365 * DAY)) };
		}

		function bucketLabel(bucket, dict) {
			const fn = dict.time[bucket.unit];
			return typeof fn === "function" ? fn(bucket.n) : String(bucket.n);
		}

		/** Style sheet injected with the same data-plugin discipline as platform bundles. */
		function injectStyle() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_TAG)}]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = CSS_TAG;
			tag.textContent = [
				"button.dshAr_button{box-sizing:border-box;cursor:pointer;flex:none;width:16px;height:16px;margin:0 -8px 0 0;padding:0;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary);display:inline-flex;align-items:center;justify-content:center;opacity:1;transition:color .12s ease,background-color .12s ease,width .12s ease,padding .12s ease}",
				"button.dshAr_button:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}",
				"button.dshAr_button.dshAr_confirm{width:auto;height:20px;padding:0 8px;gap:4px;color:#fff;background:var(--dsw-alias-state-error-primary,#d64545);border-radius:10px;font-size:12px;line-height:1;font-weight:500}",
				"button.dshAr_button.dshAr_confirm:hover{color:#fff;background:var(--dsw-alias-state-error-primary,#d64545)}",
				"button.dshAr_button.dshAr_confirm svg{width:12px;height:12px}"
			].join("\n");
			document.head.appendChild(tag);
		}

		/** Services required by the client half (service names, not module ids). */
		const inject = ["workspaces", "sessions"];

		/**
		 * Activate the inline archive behaviors.
		 * @param ctx - client root context with workspaces + sessions injected.
		 */
		function apply(ctx) {
			const workspaces = ctx.workspaces;
			const sessions = ctx.sessions;
			if (typeof document === "undefined" || workspaces === void 0 || sessions === void 0 || workspaces.list === void 0 || sessions.list === void 0) return;

			let dict = DICTS[currentLang()];

			// ------------------------------------------------------ state
			let cachedSessions = void 0;
			let cachedWorkspaces = void 0;
			let byTitle = new Map();
			let cachedNow = 0;

			const rebuildIndex = () => {
				const snapS = sessions.list.getSnapshot();
				const snapW = workspaces.list.getSnapshot();
				dict = DICTS[currentLang()];
				if (snapS === cachedSessions && snapW === cachedWorkspaces && cachedNow !== 0) return; // rows unchanged; keep index
				cachedSessions = snapS;
				cachedWorkspaces = snapW;
				cachedNow = Date.now();
				byTitle = new Map();
				if (!snapS || !snapS.byId) return;
				const archived = new Set(snapW?.archivedSessionIds || []);
				const current = snapS.current;
				for (const id of snapS.ids) {
					const s = snapS.byId[id];
					if (!s) continue;
					if (s.origin === "subagent" || archived.has(id)) continue;
					if (s.blank && s.id !== current) continue;
					const title = s.blank ? "New Session" : (s.displayTitle ?? s.title ?? "");
					if (title === "") continue;
					let list = byTitle.get(title);
					if (list === void 0) {
						list = [];
						byTitle.set(title, list);
					}
					list.push(s);
				}
			};

			const resolveId = (title, timeText) => {
				const candidates = byTitle.get(title);
				if (candidates === void 0 || candidates.length === 0) return void 0;
				if (candidates.length === 1) return candidates[0].id;
				// duplicate display titles: whoever also matches the rendered time bucket wins.
				if (timeText !== "") {
					const hits = candidates.filter((c) => bucketLabel(timeBucket(c.updatedAt, cachedNow), dict) === timeText);
					if (hits.length === 1) return hits[0].id;
				}
				return void 0;
			};

			const renderIdle = (btn) => {
				btn.classList.remove("dshAr_confirm");
				btn.setAttribute("aria-label", dict.archiveAria);
				btn.innerHTML = ARCHIVE_ICON;
			};

			const attachButton = (btn, row) => {
				let timer = null;
				const reset = () => {
					if (timer !== null) {
						clearTimeout(timer);
						timer = null;
					}
					renderIdle(btn);
				};
				btn.addEventListener("click", (event) => {
					event.stopPropagation();
					if (btn.classList.contains("dshAr_confirm")) {
						const sessionId = row.dataset.dshArSessionId;
						if (sessionId !== void 0 && sessionId !== "") {
							workspaces.archiveSession(sessionId).catch((reason) => {
								console.warn("[easy-archive] archive rejected:", reason);
								reset();
							});
						} else {
							console.warn("[easy-archive] no session id stamped on row; archive aborted");
						}
						reset();
						return;
					}
					btn.classList.add("dshAr_confirm");
					btn.setAttribute("aria-label", dict.confirmAria);
					btn.innerHTML = CHECK_ICON + `<span>${dict.confirmText}</span>`;
					if (timer !== null) clearTimeout(timer);
					timer = setTimeout(reset, 4000);
				});
				row.addEventListener("mouseleave", reset);
			};

			const processRow = (row) => {
				// Session rows end with [.., title, time, actions]; the kebab sits (possibly
				// wrapped) inside the trailing action cell. Blank / new-session rows have no
				// action cell and no kebab, so they fall out through the kebab check.
				const children = Array.from(row.children);
				if (children.length < 3) return;
				const actions = children[children.length - 1];
				const timeEl = children[children.length - 2];
				const titleEl = children[children.length - 3];
				let kebab = null;
				for (const candidate of actions.querySelectorAll("button")) {
					if (!candidate.classList.contains("dshAr_button")) {
						kebab = candidate;
						break;
					}
				}
				if (kebab === null) return;
				const title = (titleEl.textContent || "").trim();
				if (title === "") return;
				const sessionId = resolveId(title, timeEl === null ? "" : (timeEl.textContent || "").trim());
				if (sessionId === void 0) return; // ambiguous title — stay conservative, do not risk archiving the wrong session
				if (row.dataset.dshArSessionId !== sessionId) row.dataset.dshArSessionId = sessionId;
				if (row.querySelector("button.dshAr_button") !== null) return;
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "dshAr_button";
				btn.setAttribute("aria-label", dict.archiveAria);
				btn.innerHTML = ARCHIVE_ICON;
				// Put the button inside the trailing action cell, before the kebab wrapper,
				// so the row's own child structure (…, title, time, actions) stays stable.
				actions.insertBefore(btn, actions.firstChild);
				attachButton(btn, row);
			};

			const syncAll = () => {
				rebuildIndex();
				const rows = document.querySelectorAll(ROW_SELECTOR);
				for (const row of rows) processRow(row);
			};

			// ------------------------------------------------------ observers
			let dirty = false;
			const scheduleSync = () => {
				if (dirty) return;
				dirty = true;
				const finish = () => {
					dirty = false;
					syncAll();
			purgeArchiveFromMenus();
				};
				// rAF coalesces per frame; the timeout fallback covers throttled/hidden
				// tabs (background windows starve rAF) so rows always get stamped.
				requestAnimationFrame(finish);
			};

			const rowObserver = new MutationObserver(scheduleSync);
			rowObserver.observe(document.body, { childList: true, subtree: true });

			const doneMenus = new WeakSet();
			const purgeArchiveFromMenus = () => {
				for (const menu of document.querySelectorAll('[role="menu"]')) {
					if (doneMenus.has(menu)) continue;
					doneMenus.add(menu);
					for (const item of menu.querySelectorAll('button[role="menuitem"]')) {
						const text = (item.textContent || "").replace(/s+/g, "");
						if (dict.menuArchive.includes(text)) item.style.display = "none";
					}
				}
			};
			const menuObserver = new MutationObserver(purgeArchiveFromMenus);
			menuObserver.observe(document.body, { childList: true, subtree: true });

			// any click outside an archive button disarms every armed confirm pill.
			const onDocumentClick = (event) => {
				const target = event.target;
				if (target instanceof Element && target.closest("button.dshAr_button") !== null) return;
				for (const btn of document.querySelectorAll("button.dshAr_button.dshAr_confirm")) renderIdle(btn);
			};
			document.addEventListener("click", onDocumentClick, true);

			const unsubSessions = sessions.list.subscribe(scheduleSync);
			const unsubWorkspaces = workspaces.list.subscribe(scheduleSync);

			// Low-frequency heartbeat: guarantees stamping even if a mutation was
			// missed or the tab was throttled; idempotent and cheap (the index is
			// reused while the snapshot stores are unchanged).
			const heartbeat = setInterval(syncAll, 3000);

			syncAll();

			ctx.effect(() => () => {
				rowObserver.disconnect();
				menuObserver.disconnect();
				document.removeEventListener("click", onDocumentClick, true);
				unsubSessions();
				unsubWorkspaces();
				clearInterval(heartbeat);
			}, "easy-archive: activate");
		}

		injectStyle();

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});