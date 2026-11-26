// 6. 앱 상태(appState) 초기화, 통합 렌더링(renderAll), 토스트 알림 및 초기 구동 모듈 (js/app.js)

let appState = getDefaultState();
window.appState = appState;

function renderAll() {
    function safeCall(fn, name) {
        if (typeof fn === "function") {
            try {
                fn();
            } catch (err) {
                console.error("renderAll sub-render failed (" + name + "):", err);
            }
        }
    }

    safeCall(renderAuthGate, "renderAuthGate");
    safeCall(renderHeaderStatus, "renderHeaderStatus");
    safeCall(renderExecutiveRosterTable, "renderExecutiveRosterTable");
    safeCall(renderFullMemberRosterTable, "renderFullMemberRosterTable");
    safeCall(renderEventsView, "renderEventsView");
    safeCall(renderAttendanceView, "renderAttendanceView");
    safeCall(renderActivityView, "renderActivityView");
    safeCall(renderConcertFeedbackView, "renderConcertFeedbackView");
    safeCall(renderCurrentBylawsView, "renderCurrentBylawsView");
    safeCall(renderFullSearchView, "renderFullSearchView");
    safeCall(renderDrawerSearchResults, "renderDrawerSearchResults");
    safeCall(renderAgendaStepper, "renderAgendaStepper");
    safeCall(renderActiveVotingView, "renderActiveVotingView");
    safeCall(renderElectionView, "renderElectionView");
    safeCall(renderWinnerView, "renderWinnerView");
    safeCall(renderSettlementView, "renderSettlementView");
    safeCall(renderAdminView, "renderAdminView");
}

let toastTimer = null;
function showToast(msg) {
    const banner = document.getElementById("toastBanner");
    const textEl = document.getElementById("toastMessageText");
    if (!banner || !textEl) return;
    textEl.textContent = msg;
    banner.classList.remove("hidden");
    banner.classList.add("flex");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
        banner.classList.add("hidden");
        banner.classList.remove("flex");
    }, 3200);
}

// Single sticky header subtle shadow on scroll (Zero layout-shift & No layout jitter)
function updateHeaderScrollShadow() {
    const header = document.getElementById("mainHeader");
    if (!header) return;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0) || 0;
    if (scrollY > 15) {
        header.classList.add("is-scrolled");
    } else {
        header.classList.remove("is-scrolled");
    }
}

// Remove jittery toggles: ONLY subtle elevation shadow is added on scroll
window.addEventListener("scroll", updateHeaderScrollShadow, { passive: true });


// Horizontal drag-to-scroll for desktop mouse interaction (Swipe emulation)
function initTabsDragToScroll() {
    const nav = document.getElementById("mainTabsNav");
    if (!nav) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    nav.addEventListener("mousedown", function(e) {
        if (e.button !== 0) return; // left click only
        isDown = true;
        hasMoved = false;
        startX = e.pageX - nav.offsetLeft;
        scrollLeft = nav.scrollLeft;
        nav.classList.add("is-dragging");
        nav.style.scrollBehavior = "auto";
    });

    window.addEventListener("mousemove", function(e) {
        if (!isDown) return;
        const x = e.pageX - nav.offsetLeft;
        const walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 4) {
            hasMoved = true;
            e.preventDefault();
        }
        nav.scrollLeft = scrollLeft - walk;
        updateTabsScrollIndicator();
    });

    function endDrag() {
        if (!isDown) return;
        isDown = false;
        nav.classList.remove("is-dragging");
        nav.style.scrollBehavior = "smooth";
        updateTabsScrollIndicator();
    }

    window.addEventListener("mouseup", endDrag);

    // Suppress tab button click if user was dragging
    nav.addEventListener("click", function(e) {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
        }
    }, true);
}

// Horizontal wheel scroll conversion for standard desktop mouse
function initTabsWheelScroll() {
    const nav = document.getElementById("mainTabsNav");
    const wrapper = document.getElementById("tabsWrapper");
    const target = wrapper || nav;
    if (!nav || !target) return;

    target.addEventListener("wheel", function(e) {
        if (nav.scrollWidth <= nav.clientWidth) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
            e.preventDefault();
            nav.scrollBy({ left: e.deltaY, behavior: "auto" });
            updateTabsScrollIndicator();
        }
    }, { passive: false });
}

function restoreInitialViewState() {
    loadStateFromStorage();
    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const isExec = (typeof isCurrentUserExecutive === "function")
        ? isCurrentUserExecutive()
        : Boolean(appState.isAdminAuthenticated);

    let targetTab = "events";
    if (typeof window !== "undefined" && window.location && window.location.hash) {
        const hashVal = window.location.hash.replace("#", "").toLowerCase().trim();
        const validTabs = ["attendance", "events", "reports", "settlement", "bylaws", "election", "charter", "admin", "winner"];
        if (validTabs.indexOf(hashVal) !== -1) {
            targetTab = hashVal;
        }
    } else if (appState.activeTab) {
        targetTab = appState.activeTab;
    }

    if (targetTab === "admin" && !isExec) {
        targetTab = "events";
    }
    if (targetTab === "winner" && !isExec && !appState.winnerPagePublic) {
        targetTab = "events";
    }

    try {
        if (typeof document !== "undefined" && document.documentElement) {
            if (voter || (appState && appState.guestBrowsing)) { document.documentElement.classList.add("is-authenticated"); } else { document.documentElement.classList.remove("is-authenticated"); document.documentElement.removeAttribute("data-active-tab"); }
            document.documentElement.setAttribute("data-active-tab", targetTab);
        }
    } catch (e) {}

    switchMainTab(targetTab, null, { skipScroll: true });
    renderAll();
    if (typeof populateLoginMemberSelect === "function") {
        populateLoginMemberSelect();
    }
}

window.addEventListener("DOMContentLoaded", function() {
    restoreInitialViewState();

    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.init === "function") {
        window.FirebaseSync.init();
    }
    updateHeaderScrollShadow();

    // Horizontal tabs drag-to-scroll, wheel scroll & responsive listeners
    initTabsDragToScroll();
    initTabsWheelScroll();

    const nav = document.getElementById("mainTabsNav");
    if (nav) {
        nav.addEventListener("scroll", updateTabsScrollIndicator, { passive: true });
        if (window.ResizeObserver) {
            try {
                const ro = new ResizeObserver(function() {
                    updateTabsScrollIndicator();
                });
                ro.observe(nav);
            } catch (e) {}
        }
    }
    window.addEventListener("resize", updateTabsScrollIndicator, { passive: true });
    window.addEventListener("load", updateTabsScrollIndicator, { passive: true });
    if (typeof updateTabsScrollIndicator === "function") {
        updateTabsScrollIndicator();
        setTimeout(updateTabsScrollIndicator, 100);
        setTimeout(updateTabsScrollIndicator, 350);
    }

    // Auto-scroll initial active tab into view
    const activeBtn = document.querySelector(".main-tab-btn.bg-indigo-600");
    if (activeBtn) {
        try {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
    }

    // Initialize session inactivity timeout (20 minutes)
    initSessionTimeoutMonitor();
});

// ============================================================
// 세션 미활동 타임아웃 감지 및 자동 로그아웃 (20분 유휴 시 자동 종료)
// ============================================================
const SESSION_INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20분
let lastUserActivityTime = Date.now();

function recordUserActivity() {
    lastUserActivityTime = Date.now();
    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("hanwoori_last_activity", String(lastUserActivityTime));
        }
    } catch (e) {}
}
window.recordUserActivity = recordUserActivity;

function initSessionTimeoutMonitor() {
    const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    let activityThrottleTimer = null;
    activityEvents.forEach(function(evtName) {
        window.addEventListener(evtName, function() {
            if (!activityThrottleTimer) {
                recordUserActivity();
                activityThrottleTimer = setTimeout(function() {
                    activityThrottleTimer = null;
                }, 1000);
            }
        }, { passive: true });
    });

    setInterval(function() {
        const isLoggedIn = Boolean(appState && (appState.hasExplicitLogin || appState.currentVoterId));
        if (!isLoggedIn) return;

        let lastActive = lastUserActivityTime;
        try {
            if (typeof sessionStorage !== "undefined") {
                const stored = Number(sessionStorage.getItem("hanwoori_last_activity"));
                if (stored && stored > lastActive) {
                    lastActive = stored;
                    lastUserActivityTime = stored;
                }
            }
        } catch (e) {}

        const elapsed = Date.now() - lastActive;
        if (elapsed > SESSION_INACTIVITY_TIMEOUT_MS) {
            handleSessionInactivityTimeout();
        }
    }, 10000);
}

function handleSessionInactivityTimeout() {
    if (!appState || (!appState.hasExplicitLogin && !appState.currentVoterId)) return;

    appState.currentVoterId = null;
    appState.currentVoterName = "";
    appState.hasExplicitLogin = false;
    appState.isAdminAuthenticated = false;
    appState.adminPreviewAsMember = false;

    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem("hanwoori_last_activity");
        }
    } catch (e) {}

    saveStateToStorage({ skipCloudConfigPush: true });

    const gate = document.getElementById("loginGateScreen");
    const shell = document.getElementById("appShell");
    if (gate) {
        gate.style.setProperty("display", "flex", "important");
        gate.classList.remove("hidden");
    }
    if (shell) {
        shell.style.setProperty("display", "none", "important");
        shell.classList.add("hidden");
    }
    if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.remove("is-authenticated");
    }

    renderAll();
    showToast("⏱️ 20분 동안 활동이 없어 안전을 위해 자동 로그아웃되었습니다.");
}
window.handleSessionInactivityTimeout = handleSessionInactivityTimeout;
