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
		 * and inserts a small archive button into the row’s trailing action cell,
		 * before the kebab — revealed together with the ⋮ menu on row hover. Clicking the button never
		 * bubbles to the row's "open session" handler.
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

		/**
		 * Archive icon: the DSH-native `IconArchiveOutline20` glyph, extracted
		 * verbatim from @deepseek-ai/dsh-client-ui-primitives (the same icon the
		 * stock ⋮ menu uses for "归档会话"), rendered at 16px inside its 20-unit
		 * viewBox — exactly like the menu item renders it at size 16.
		 */
		const ARCHIVE_ICON =
			'<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
			'<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M15.8659 2.05975C17.2603 2.05995 18.3913 3.19096 18.3914 4.58527V5.4874C18.3914 6.02747 18.2192 6.52672 17.9303 6.93735C17.9336 6.96524 17.9388 6.99318 17.9388 7.02195V12.8884C17.9388 13.6345 17.9395 14.2379 17.8996 14.7254C17.8642 15.1593 17.7936 15.5499 17.6373 15.9141L17.5654 16.0685C17.278 16.6328 16.8405 17.1046 16.3038 17.434L16.0679 17.5661C15.66 17.7739 15.2196 17.8598 14.7237 17.9003C14.2362 17.9401 13.6327 17.9405 12.8867 17.9405H7.11122C6.36511 17.9405 5.76171 17.9401 5.27418 17.9003C4.84051 17.8649 4.44949 17.7952 4.08545 17.6391L3.93104 17.5661C3.36673 17.2785 2.89392 16.8414 2.56465 16.3044L2.43245 16.0685C2.22473 15.6608 2.13878 15.2211 2.09825 14.7254C2.05841 14.2379 2.05912 13.6345 2.05912 12.8884V7.02195C2.05912 6.99284 2.06422 6.96449 2.06758 6.93629C1.77931 6.52592 1.60858 6.02687 1.60858 5.4874V4.58527C1.60876 3.19084 2.73962 2.05975 4.1341 2.05975H15.8659ZM16.4984 7.92936C16.296 7.98169 16.0847 8.01288 15.8659 8.01291H4.1341C3.91478 8.01291 3.70246 7.98194 3.49955 7.92936V12.8884C3.49955 13.6582 3.50053 14.1927 3.53445 14.608C3.56769 15.0146 3.62923 15.244 3.71635 15.415L3.7925 15.5514C3.98339 15.8627 4.25749 16.1165 4.58464 16.2833L4.72529 16.3435C4.88095 16.3993 5.08638 16.4402 5.39158 16.4651C5.80685 16.4991 6.34138 16.5001 7.11122 16.5001H12.8867C13.6564 16.5001 14.1911 16.499 14.6063 16.4651C15.0128 16.432 15.2423 16.3703 15.4133 16.2833L15.5508 16.2061C15.8618 16.0152 16.116 15.7419 16.2827 15.415L16.3429 15.2732C16.3985 15.1177 16.4396 14.9128 16.4645 14.608C16.4985 14.1927 16.4984 13.6583 16.4984 12.8884V7.92936ZM4.1341 3.50019C3.53511 3.50019 3.0492 3.98631 3.04902 4.58527V5.4874C3.04902 6.08649 3.535 6.57248 4.1341 6.57248H15.8659C16.4648 6.57228 16.951 6.08638 16.951 5.4874V4.58527C16.9509 3.98644 16.4647 3.50038 15.8659 3.50019H4.1341Z"/>' +
			"</svg>";

		/**
		 * Check glyph for the armed confirm state: the DSH-native
		 * `IconCheckOutline16` path, rendered at 12px inside its 16-unit viewBox.
		 */
		const CHECK_ICON =
			'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
			'<path fill="currentColor" d="M15.0498 3.92579L8.49512 12.3818C8.25774 12.6881 8.04517 12.9645 7.84668 13.1689C7.63957 13.3823 7.38732 13.5841 7.04492 13.6719C6.86373 13.7183 6.6757 13.7346 6.48926 13.7197C6.13666 13.6915 5.8528 13.5355 5.6123 13.3604C5.38201 13.1926 5.12573 12.9567 4.83984 12.6953L1.03125 9.21289L1.96875 8.1875L5.77734 11.6699C6.08684 11.9529 6.27773 12.1249 6.43066 12.2363C6.50183 12.2882 6.54699 12.3135 6.57324 12.3252C6.58525 12.3305 6.59269 12.3322 6.5957 12.333C6.59802 12.3336 6.59961 12.334 6.59961 12.334C6.63317 12.3367 6.66758 12.3335 6.7002 12.3252C6.7002 12.3252 6.70211 12.3251 6.7041 12.3242C6.70698 12.3229 6.71348 12.319 6.72461 12.3115C6.74849 12.2956 6.78843 12.2642 6.84961 12.2012C6.98138 12.0654 7.13957 11.8628 7.39648 11.5313L13.9502 3.07422L15.0498 3.92579Z"/>' +
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
				"button.dshAr_button{box-sizing:border-box;cursor:pointer;flex:none;width:16px;height:16px;margin:0 2px 0 0;padding:0;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;opacity:.75;transition:color .12s ease,background-color .12s ease,opacity .12s ease,width .12s ease,padding .12s ease}",
				"button.dshAr_button:hover{opacity:1;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
				"button.dshAr_button.dshAr_confirm{width:auto;height:20px;padding:0 8px;gap:4px;opacity:1;color:#fff;background:var(--dsw-alias-state-error-primary,#d64545);border-radius:10px;font-size:12px;line-height:1;font-weight:500}",
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
				// wrapped) inside the trailing action cell, which the stock browser only
				// reveals on row hover. Our archive button lives in the same cell, right
				// before the kebab, so it shows together with the ⋮ menu on row hover —
				// and stays hidden otherwise, matching the stock reveal behavior.
				// Blank / new-session rows have no action cell and no kebab, so they fall
				// out through the kebab check.
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
				// Inside the trailing action cell, before the kebab wrapper, so the row's
				// own child structure (…, title, time, actions) stays stable.
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