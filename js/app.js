// 6. 앱 상태(appState) 초기화, 통합 렌더링(renderAll), 토스트 알림 및 초기 구동 모듈 (js/app.js)

let appState = getDefaultState();

function renderAll() {
    renderHeaderStatus();
    renderExecutiveRosterTable();
    renderFullMemberRosterTable();
    renderEventsView();
    renderConcertFeedbackView();
    renderCurrentBylawsView();
    renderFullSearchView();
    renderDrawerSearchResults();
    renderAgendaStepper();
    renderActiveVotingView();
    renderElectionView();
    renderWinnerView();
    renderSettlementView();
    renderAdminView();
    renderAuthModalMemberList();
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

window.addEventListener("DOMContentLoaded", function() {
    loadStateFromStorage();
    renderAll();
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
});
