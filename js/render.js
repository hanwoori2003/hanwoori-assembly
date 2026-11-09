// 4. DOM 렌더링 및 UI 바인딩 모듈 (js/render.js)

function renderHeaderStatus() {
    const majority = getMajorityThreshold(appState.totalAttendees);
    const totalEl = document.getElementById("headerTotalAttendees");
    if (totalEl) totalEl.textContent = appState.totalAttendees + "명";
    const majEl = document.getElementById("headerMajorityThreshold");
    if (majEl) majEl.textContent = majority + "표↑";

    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);
    const isRealExec = (typeof isRealExecutiveAuthenticated === "function") ? isRealExecutiveAuthenticated() : isExec;
    const voter = getCurrentVoter();
    const rolePrefix = isExec ? "👑운영진 · " : "";
    const voterPartStr = voter.detailPart ? (voter.part + " · " + voter.detailPart) : voter.part;
    const voterBadgeStr = rolePrefix + voter.name + " (" + voterPartStr + ")";

    // Header styling based on Admin Mode
    const headerEl = document.getElementById("mainHeader");
    if (headerEl) {
        if (isExec) {
            headerEl.classList.add("admin-mode-active");
        } else {
            headerEl.classList.remove("admin-mode-active");
        }
    }

    // 단일 헤더 투표자 배지 및 버튼 텍스트 업데이트
    const badgeEl = document.getElementById("headerVoterBadge");
    if (badgeEl) badgeEl.textContent = voterBadgeStr;

    // 하위 호환성 ID 업데이트 (오류 방지)
    const b1 = document.getElementById("currentVoterBadgeText");
    if (b1) b1.textContent = voterBadgeStr;
    const b2 = document.getElementById("stickyVoterBadgeText");
    if (b2) b2.textContent = voterBadgeStr;
    const b3 = document.getElementById("miniHeaderMemberName");
    if (b3) b3.textContent = voterBadgeStr;

    // Header Admin Mode Badge & Preview Toggle
    const headerAdminBadgeContainer = document.getElementById("headerAdminModeBadgeContainer");
    if (headerAdminBadgeContainer) {
        if (isRealExec) {
            if (isExec) {
                headerAdminBadgeContainer.innerHTML = 
                    '<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] sm:text-xs shadow-xs animate-pulse whitespace-nowrap">' +
                        '<span>👑</span> <span>운영진 모드 ON</span>' +
                    '</span>' +
                    '<button type="button" onclick="toggleAdminPreviewMode()" class="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap">' +
                        '<span>👁️</span> <span class="hidden sm:inline">일반 단원</span> 미리보기' +
                    '</button>';
            } else {
                headerAdminBadgeContainer.innerHTML = 
                    '<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold text-[11px] sm:text-xs whitespace-nowrap">' +
                        '<span>👁️</span> <span>단원 화면 미리보기 중</span>' +
                    '</span>' +
                    '<button type="button" onclick="toggleAdminPreviewMode()" class="px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[11px] sm:text-xs transition shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap">' +
                        '<span>👑</span> <span>운영진 모드로 복귀</span>' +
                    '</button>';
            }
        } else {
            headerAdminBadgeContainer.innerHTML = "";
        }
    }

    // Admin Quick Action Bar in Main Container
    const quickBarContainer = document.getElementById("adminQuickActionBarContainer");
    if (quickBarContainer) {
        if (isExec) {
            quickBarContainer.innerHTML = 
                '<div id="adminQuickActionBar" class="mb-6 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-3">' +
                    '<div class="flex items-center gap-2.5">' +
                        '<span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/30 shadow-xs shrink-0">👑</span>' +
                        '<div>' +
                            '<div class="flex items-center gap-2">' +
                                '<span class="text-xs sm:text-sm font-black text-amber-300">메리고잉 운영진 통합 퀵 컨트롤 바</span>' +
                                '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">ADMIN ACTIVE</span>' +
                            '</div>' +
                            '<p class="text-[11px] text-slate-300">총회 식순·단칙 개정안·단장 선거·명부 및 설정을 원클릭으로 총괄 제어합니다.</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-1.5 flex-wrap">' +
                        '<button type="button" onclick="openScheduleModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>식순 추가</span>' +
                        '</button>' +
                        '<button type="button" onclick="openAgendaModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>새 개정안 추가</span>' +
                        '</button>' +
                        '<button type="button" onclick="openCandidateModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>단장 후보 등록</span>' +
                        '</button>' +
                        '<button type="button" onclick="triggerBylawFileUpload()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>📂</span> <span>단칙 .docx 업로드</span>' +
                        '</button>' +
                        '<button type="button" onclick="switchMainTab(\'admin\')" class="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1 cursor-pointer shadow-sm">' +
                            '<span>⚙</span> <span>전체 설정/명부</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';
        } else {
            quickBarContainer.innerHTML = "";
        }
    }

    // 투표 현황 네비게이션 배지
    const curAg = getActiveAgenda();
    const curIdx = curAg ? ((appState.agendas || []).findIndex(function(a) { return a.id === curAg.id; }) + 1) : 1;
    const navProg = document.getElementById("navBadgeAgendaProgress");
    if (navProg) navProg.textContent = curIdx + "/" + ((appState.agendas || []).length || 12);

    const navElec = document.getElementById("navBadgeElectionMode");
    if (navElec) {
        navElec.textContent = appState.election.mode === "single" ? "단독 찬반" : "다자 경선";
    }

    // 운영진 전용 탭 표시 제어 (단장 당선 공고, 메리고잉 운영진 제어)
    const winnerBtn = document.getElementById("tabBtn-winner");
    if (winnerBtn) {
        if (isExec || appState.winnerPagePublic) {
            winnerBtn.classList.remove("hidden");
            winnerBtn.classList.add("flex");
        } else {
            winnerBtn.classList.add("hidden");
            winnerBtn.classList.remove("flex");
        }
    }

    const adminBtn = document.getElementById("tabBtn-admin");
    if (adminBtn) {
        if (isExec) {
            adminBtn.classList.remove("hidden");
            adminBtn.classList.add("flex");
        } else {
            adminBtn.classList.add("hidden");
            adminBtn.classList.remove("flex");
        }
    }
}

function renderExecutiveRosterTable() {
    const container = document.getElementById("executiveRosterTableBody");
    if (!container) return;
    let html = "";
    EXECUTIVE_ROSTER.forEach(function(exec, i) {
        html += '<tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">' +
            '<td class="py-2.5 px-3 text-center text-slate-500 font-semibold">' + (i + 1) + '</td>' +
            '<td class="py-2.5 px-3 font-bold text-slate-800">' +
                '<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold mr-1.5">' + escapeHtml(exec.role) + '</span>' +
                (exec.subRole && exec.subRole !== '-' ? '<span class="text-slate-500 font-normal">(' + escapeHtml(exec.subRole) + ')</span>' : '') +
            '</td>' +
            '<td class="py-2.5 px-3 font-extrabold text-slate-900">' + escapeHtml(exec.name) + '</td>' +
            '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(exec.gen) + '기</td>' +
            '<td class="py-2.5 px-3">' +
                '<span class="font-semibold text-slate-700">' + escapeHtml(exec.part) + '</span>' +
                (exec.detailPart ? '<span class="text-slate-400 text-[11px] ml-1">(' + escapeHtml(exec.detailPart) + ')</span>' : '') +
            '</td>' +
            '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(exec.company) + '</td>' +
            '<td class="py-2.5 px-3 text-slate-500 text-[11px] font-mono">' + escapeHtml(exec.email) + '</td>' +
        '</tr>';
    });
    container.innerHTML = html;
}

function renderFullMemberRosterTable() {
    const container = document.getElementById("fullMemberRosterTableBody");
    if (!container) return;
    const fKey = appState.rosterPartFilter || "all";
    const q = (appState.rosterSearchQuery || "").trim().toLowerCase();

    const filtered = appState.members.filter(function(m) {
        if (fKey !== "all" && m.basePart !== fKey) return false;
        if (q) {
            const hay = (m.name + " " + m.part + " " + m.company + " " + m.gen).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    });

    let html = "";
    filtered.forEach(function(m, i) {
        html += '<tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">' +
            '<td class="py-2 px-3 text-center text-slate-400">' + (i + 1) + '</td>' +
            '<td class="py-2 px-3 font-bold text-slate-900">' + escapeHtml(m.name) + '</td>' +
            '<td class="py-2 px-3 text-slate-600">' + escapeHtml(m.gen) + '</td>' +
            '<td class="py-2 px-3">' +
                '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">' + escapeHtml(m.part) + '</span>' +
            '</td>' +
            '<td class="py-2 px-3 text-slate-600">' + escapeHtml(m.company) + '</td>' +
            '<td class="py-2 px-3">' +
                (m.isExecutive ? '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">' + escapeHtml(m.role) + '</span>' : '<span class="text-slate-400 text-[11px]">일반단원</span>') +
            '</td>' +
        '</tr>';
    });
    container.innerHTML = html || '<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">일치하는 단원이 없습니다.</td></tr>';
}

function renderEventsView() {
    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);

    // 1. 식순 헤더 운영진 제어 버튼
    const schHeader = document.getElementById("assemblyScheduleAdminHeaderControls");
    if (schHeader) {
        if (isExec) {
            schHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openScheduleModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer">+ 식순 추가</button>';
        } else {
            schHeader.innerHTML = "";
        }
    }

    // 2. 식순 리스트 렌더링
    const container = document.getElementById("assemblyScheduleListContainer");
    if (container) {
        let html = "";
        (appState.assemblySchedule || []).forEach(function(item) {
            const isDone = item.status === "완료";
            const isIng = item.status === "진행중";
            const statusBadge = isDone
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">완료</span>'
                : (isIng
                    ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse shrink-0">진행중</span>'
                    : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 shrink-0">' + escapeHtml(item.status) + '</span>');

            const jumpBtn = item.targetTab
                ? '<button type="button" onclick="switchMainTab(\'' + item.targetTab + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition shrink-0 cursor-pointer">' + escapeHtml(item.btnLabel || "이동 ->") + '</button>'
                : '';

            const execControls = isExec
                ? '<div class="flex items-center gap-1.5 shrink-0">' +
                    '<button type="button" onclick="openScheduleModal(\'' + item.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteScheduleItem(\'' + item.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                  '</div>'
                : '';

            html += '<div class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
                '<div class="flex items-start gap-3 min-w-0">' +
                    statusBadge +
                    '<div class="min-w-0">' +
                        '<h4 class="text-sm font-extrabold text-slate-900 truncate">' + escapeHtml(item.title) + '</h4>' +
                        '<p class="text-xs text-slate-600 mt-0.5 break-keep">' + escapeHtml(item.desc) + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2 shrink-0 self-end sm:self-center">' +
                    jumpBtn +
                    execControls +
                '</div>' +
            '</div>';
        });
        container.innerHTML = html || '<div class="text-center py-6 text-slate-400 text-xs">등록된 식순이 없습니다.</div>';
    }

    // 3. 연간 행사 헤더 운영진 제어 버튼
    const evHeader = document.getElementById("annualEventsAdminHeaderControls");
    if (evHeader) {
        if (isExec) {
            evHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openEditEventModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer">+ 행사 내역 추가</button>';
        } else {
            evHeader.innerHTML = "";
        }
    }

    // 4. 연간 행사 목록 렌더링
    const evCont = document.getElementById("annualEventsListContainer");
    if (evCont) {
        let evHtml = "";
        (appState.events || []).forEach(function(ev) {
            const execControls = isExec
                ? '<div class="flex items-center gap-1 shrink-0 pt-1 sm:pt-0">' +
                    '<button type="button" onclick="openEditEventModal(\'' + ev.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteEventItem(\'' + ev.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                  '</div>'
                : '';

            evHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
                '<div class="min-w-0">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="font-extrabold text-xs text-indigo-900">' + escapeHtml(ev.title) + '</span>' +
                        '<span class="text-[11px] text-slate-500 font-semibold">' + escapeHtml(ev.date) + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600 mt-0.5">' + escapeHtml(ev.desc) + ' <span class="text-slate-400">(' + escapeHtml(ev.place) + ')</span></p>' +
                '</div>' +
                execControls +
            '</div>';
        });
        evCont.innerHTML = evHtml || '<div class="text-center py-6 text-slate-400 text-xs">등록된 연간 행사가 없습니다.</div>';
    }
}

function renderConcertFeedbackView() {
    const survey = appState.concertSurvey;
    if (!survey) return;
    const isExec = isCurrentUserExecutive();

    const concertAdminEl = document.getElementById("concertAdminActions");
    if (concertAdminEl) {
        if (isExec) {
            concertAdminEl.innerHTML = '<button type="button" onclick="openSurveyModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition flex items-center gap-1 cursor-pointer"><span>✎</span> 설문 요약 수정</button>';
        } else {
            concertAdminEl.innerHTML = '';
        }
    }

    const rateCont = document.getElementById("concertMetricsContainer");
    if (rateCont) {
        rateCont.innerHTML = 
            '<div class="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">' +
                '<div class="text-xs text-indigo-700 font-bold">정기연주회 만족도</div>' +
                '<div class="text-2xl font-black text-indigo-950 mt-1">' + survey.regularConcertRate + '%</div>' +
                '<div class="text-[11px] text-indigo-500 mt-0.5">매우 만족 60.6%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-purple-50/60 border border-purple-100 text-center">' +
                '<div class="text-xs text-purple-700 font-bold">프로그램 만족도</div>' +
                '<div class="text-2xl font-black text-purple-950 mt-1">' + survey.programRate + '%</div>' +
                '<div class="text-[11px] text-purple-500 mt-0.5">매우 만족 59.2%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">' +
                '<div class="text-xs text-emerald-700 font-bold">공연장(KBS홀) 만족도</div>' +
                '<div class="text-2xl font-black text-emerald-950 mt-1">' + survey.hallRate + '%</div>' +
                '<div class="text-[11px] text-emerald-500 mt-0.5">매우 만족 67.6%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-amber-50/60 border border-amber-100 text-center">' +
                '<div class="text-xs text-amber-700 font-bold">관객 호응 만족도</div>' +
                '<div class="text-2xl font-black text-amber-950 mt-1">' + survey.audienceRate + '%</div>' +
                '<div class="text-[11px] text-amber-500 mt-0.5">매우 만족 70.4%</div>' +
            '</div>';
    }

    const songCont = document.getElementById("concertFavoriteSongsContainer");
    if (songCont) {
        let sHtml = "";
        (survey.favoriteSongs || []).forEach(function(s, i) {
            const pct = Math.round((s.votes / 71) * 100);
            sHtml += '<div class="space-y-1">' +
                '<div class="flex justify-between text-xs font-bold text-slate-800">' +
                    '<span>' + (i + 1) + '. ' + escapeHtml(s.title) + '</span>' +
                    '<span class="text-indigo-600">' + s.votes + '명 (' + pct + '%)</span>' +
                '</div>' +
                '<div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">' +
                    '<div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style="width: ' + pct + '%"></div>' +
                '</div>' +
            '</div>';
        });
        songCont.innerHTML = sHtml;
    }
}

function renderSettlementView() {
    const s = appState.settlement;
    if (!s) return;
    const isExec = isCurrentUserExecutive();

    const settleAdminEl = document.getElementById("settlementAdminActions");
    if (settleAdminEl) {
        if (isExec) {
            settleAdminEl.innerHTML = '<button type="button" onclick="openSettlementModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition flex items-center gap-1 cursor-pointer"><span>✎</span> 결산 내역 수정</button>';
        } else {
            settleAdminEl.innerHTML = '';
        }
    }

    const totRevEl = document.getElementById("settlementTotalRevenueDisplay");
    if (totRevEl) totRevEl.textContent = Number(s.totalRevenue).toLocaleString() + "원";
    const totExpEl = document.getElementById("settlementTotalExpenseDisplay");
    if (totExpEl) totExpEl.textContent = Number(s.totalExpense).toLocaleString() + "원";
    const balEl = document.getElementById("settlementBalanceDisplay");
    if (balEl) balEl.textContent = Number(s.balance).toLocaleString() + "원";

    const revCont = document.getElementById("settlementRevenueTableBody");
    if (revCont) {
        let html = "";
        (s.revenueItems || []).forEach(function(item, i) {
            html += '<tr class="border-b border-slate-100 text-xs">' +
                '<td class="py-2.5 px-3 text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-900">' + escapeHtml(item.name) + '</td>' +
                '<td class="py-2.5 px-3 text-right font-extrabold text-indigo-700">' + Number(item.amount).toLocaleString() + '원</td>' +
                '<td class="py-2.5 px-3 text-slate-500">' + escapeHtml(item.note) + '</td>' +
            '</tr>';
        });
        revCont.innerHTML = html;
    }

    const expCont = document.getElementById("settlementExpenseTableBody");
    if (expCont) {
        let html = "";
        (s.expenseItems || []).forEach(function(item, i) {
            html += '<tr class="border-b border-slate-100 text-xs">' +
                '<td class="py-2.5 px-3 text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-900">' + escapeHtml(item.name) + '</td>' +
                '<td class="py-2.5 px-3 text-right font-extrabold text-rose-700">' + Number(item.amount).toLocaleString() + '원</td>' +
                '<td class="py-2.5 px-3 text-slate-500">' + escapeHtml(item.note) + '</td>' +
            '</tr>';
        });
        expCont.innerHTML = html;
    }
}

function renderAgendaStepper() {
    const isExec = isCurrentUserExecutive();
    const addActionEl = document.getElementById("agendaAdminAddAction");
    if (addActionEl) {
        if (isExec) {
            addActionEl.innerHTML = '<button type="button" onclick="openAgendaModal()" class="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"><span>+</span> 새 개정안 추가</button>';
        } else {
            addActionEl.innerHTML = '';
        }
    }

    const container = document.getElementById("agendaStepperContainer");
    if (!container) return;
    let html = "";
    (appState.agendas || []).forEach(function(ag, i) {
        const isActive = ag.id === appState.activeAgendaId;
        const agNo = ag.no || ag.agendaNo || ag.number || (i + 1);
        const hasVoted = Boolean((ag.memberVotes || {})[appState.currentVoterId]);
        const isLocked = Boolean(ag.isLocked || ag.status === "closed" || ag.status === "locked");
        
        let statusBadge = "";
        if (isLocked) {
            statusBadge = '<span class="text-[10px]" title="의결 확정(잠금)">🔒</span>';
        } else if (hasVoted) {
            statusBadge = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="투표 완료"></span>';
        }

        html += '<button type="button" onclick="selectAgenda(\'' + (ag.id || ('ag-' + (i + 1))) + '\')" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ' +
            (isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50') + '">' +
            '<span>안건 ' + agNo + '</span>' +
            statusBadge +
        '</button>';
    });
    container.innerHTML = html;
}

function renderActiveVotingView() {
    const ag = getActiveAgenda();
    if (!ag) return;
    const isExec = isCurrentUserExecutive();
    const tallies = getAgendaTallies(ag);
    const myVote = (ag.memberVotes || {})[appState.currentVoterId];
    const isLocked = Boolean(ag.isLocked || ag.status === "closed" || ag.status === "locked");
    const agNo = ag.no || ag.agendaNo || ag.number || "";

    // 1. Dynamic bylaw admin control bar container (above stepper)
    const bylawAdminBar = document.getElementById("bylawAdminControlBarContainer");
    if (bylawAdminBar) {
        if (isExec) {
            const totalAg = (appState.agendas || []).length;
            const lockedAg = (appState.agendas || []).filter(function(a) { return a.isLocked || a.status === "closed" || a.status === "locked"; }).length;
            const votingAg = totalAg - lockedAg;

            bylawAdminBar.innerHTML = 
                '<div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border-2 border-amber-500/40 space-y-3 mb-2">' +
                    '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/40 pb-2.5">' +
                        '<div class="flex items-center gap-2 flex-wrap">' +
                            '<span class="text-sm font-black text-amber-300">👑 단칙 개정 총괄 제어 대시보드</span>' +
                            '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">운영진 모드</span>' +
                            '<span class="text-xs text-slate-300">총 ' + totalAg + '개 안건 중 <strong class="text-amber-300">' + lockedAg + '개 확정(마감)</strong> / <strong class="text-emerald-400">' + votingAg + '개 표결 중</strong></span>' +
                        '</div>' +
                        '<div class="flex items-center gap-2 flex-wrap">' +
                            '<button type="button" onclick="toggleAllAgendasLock(' + (lockedAg < totalAg) + ')" class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ' +
                                (lockedAg < totalAg ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                                (lockedAg < totalAg ? '🔒 전체 안건 일괄 마감(잠금)' : '🔓 전체 안건 일괄 재개') +
                            '</button>' +
                            '<button type="button" onclick="openAgendaModal()" class="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer">' +
                                '<span>+</span> 새 개정안 상정' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            bylawAdminBar.innerHTML = '';
        }
    }

    // 2. Admin actions on active agenda
    const adminActionsEl = document.getElementById("activeAgendaAdminActions");
    if (adminActionsEl) {
        if (isExec) {
            adminActionsEl.innerHTML = 
                '<div class="flex items-center gap-1.5 flex-wrap justify-end">' +
                    '<button type="button" onclick="toggleAgendaLock(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ' +
                        (isLocked ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300') + '">' +
                        '<span>' + (isLocked ? '🔓' : '🔒') + '</span> ' +
                        '<span>' + (isLocked ? '투표 재개 (잠금 해제)' : '투표 마감 및 결과 확정 (잠금)') + '</span>' +
                    '</button>' +
                    '<button type="button" onclick="openAgendaModal(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer flex items-center gap-1">✎ 안건 수정</button>' +
                    '<button type="button" onclick="deleteAgenda(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1">🗑️ 안건 삭제</button>' +
                '</div>';
        } else {
            adminActionsEl.innerHTML = '';
        }
    }

    const titleEl = document.getElementById("activeAgendaTitle");
    if (titleEl) titleEl.textContent = ag.title || ag.name || ("안건 제" + agNo + "호");
    const catEl = document.getElementById("activeAgendaCategory");
    if (catEl) {
        const catStr = ag.category || ag.targetArticle || ag.articleNo || "단칙 개정";
        const authorStr = ag.author || ag.proposer || "운영진 발의";
        catEl.textContent = catStr + " · " + authorStr;
    }
    const descEl = document.getElementById("activeAgendaSummary");
    if (descEl) descEl.textContent = ag.summary || ag.description || "";
    const reasonEl = document.getElementById("activeAgendaReason");
    if (reasonEl) reasonEl.textContent = ag.proposalReason || ag.reason || "";
    const beforeEl = document.getElementById("activeAgendaBefore");
    if (beforeEl) beforeEl.textContent = ag.beforeText || ag.before || "";
    const afterEl = document.getElementById("activeAgendaAfter");
    if (afterEl) afterEl.textContent = ag.afterText || ag.after || "";

    // Tally numbers
    const appEl = document.getElementById("activeAgendaApproveCount");
    if (appEl) appEl.textContent = tallies.approve;
    const rejEl = document.getElementById("activeAgendaRejectCount");
    if (rejEl) rejEl.textContent = tallies.reject;
    const absEl = document.getElementById("activeAgendaAbstainCount");
    if (absEl) absEl.textContent = tallies.abstain;
    const totalVotedEl = document.getElementById("activeAgendaTotalVoted");
    if (totalVotedEl) totalVotedEl.textContent = tallies.totalVoted;
    const passThreshEl = document.getElementById("activeAgendaPassThreshold");
    if (passThreshEl) passThreshEl.textContent = tallies.majorityThreshold;

    // Vote result status badge
    const statusEl = document.getElementById("activeAgendaResultStatus");
    if (statusEl) {
        if (isLocked) {
            statusEl.className = tallies.isAdopted
                ? "px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"
                : "px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1";
            statusEl.textContent = "🔒 의결 확정 (" + (tallies.isAdopted ? "가결 확정" : "부결 확정") + " · 투표 마감)";
        } else if (tallies.isAdopted) {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1";
            statusEl.textContent = "가결 요건 충족 (2/3 정족수 충족)";
        } else {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1";
            statusEl.textContent = "표결 진행 중 (가결 기준: " + tallies.majorityThreshold + "표↑)";
        }
    }

    // My vote indicator
    const myVoteEl = document.getElementById("myVoteStatusNotice");
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    if (myVoteEl) {
        if (isLocked) {
            if (myVote) {
                myVoteEl.innerHTML = '<span class="text-xs font-black text-indigo-800">🔒 나의 최종 의결: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong> (확정)</span>';
            } else {
                myVoteEl.innerHTML = '<span class="text-xs font-bold text-rose-600">🔒 투표가 공식 마감되어 더 이상 투표에 참여할 수 없습니다.</span>';
            }
        } else {
            if (myVote) {
                myVoteEl.innerHTML = '<span class="text-xs font-bold text-indigo-700">✓ 본인 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong>로 의결권을 행사하셨습니다.</span>';
            } else {
                myVoteEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 본 안건에 투표하지 않으셨습니다. 아래 버튼을 눌러 투표하세요.</span>';
            }
        }
    }

    // Voting Action Buttons (Lock enforcement)
    const btnBox = document.getElementById("activeAgendaVotingButtonsContainer");
    if (btnBox) {
        if (isLocked) {
            btnBox.innerHTML = 
                '<div class="col-span-3 p-4 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 text-center space-y-1">' +
                    '<div class="flex items-center justify-center gap-2 text-slate-800 font-black text-sm">' +
                        '<span class="text-base">🔒</span>' +
                        '<span>투표가 마감되어 의결이 확정되었습니다 (변경 불가)</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-500 font-medium">본 안건의 의결권 행사가 종료되어 최종 표결 결과가 확정되었습니다.</p>' +
                '</div>';
        } else {
            const isApp = myVote === "approve";
            const isRej = myVote === "reject";
            const isAbs = myVote === "abstain";
            btnBox.innerHTML = 
                '<button type="button" onclick="voteAgenda(\'approve\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isApp ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                    '<span>✓</span>' +
                    '<span>찬성' + (isApp ? ' (선택됨)' : '') + '</span>' +
                '</button>' +
                '<button type="button" onclick="voteAgenda(\'reject\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isRej ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                    '<span>✕</span>' +
                    '<span>반대' + (isRej ? ' (선택됨)' : '') + '</span>' +
                '</button>' +
                '<button type="button" onclick="voteAgenda(\'abstain\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isAbs ? 'bg-slate-800 text-white ring-2 ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white') + '">' +
                    '<span>-</span>' +
                    '<span>기권' + (isAbs ? ' (선택됨)' : '') + '</span>' +
                '</button>';
        }
    }
}

function renderElectionView() {
    const elec = appState.election;
    if (!elec) return;
    const isExec = isCurrentUserExecutive();
    const tallies = getElectionTallies();
    const isSingle = elec.mode === "single";
    const isClosed = Boolean(elec.status === "closed" || elec.isLocked);

    // 1. Render "👑 단장 선거 총괄 제어 대시보드" at top of election view if executive
    const barCont = document.getElementById("electionAdminControlBarContainer");
    if (barCont) {
        if (isExec) {
            barCont.innerHTML = 
                '<div id="electionAdminControlBar" class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border-2 border-amber-500/40 space-y-3.5 mb-2">' +
                    '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-2.5">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-sm font-black text-amber-300">👑 단장 선거 총괄 제어 대시보드</span>' +
                            '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">운영진 모드</span>' +
                        '</div>' +
                        '<button type="button" onclick="openCandidateModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer">' +
                            '<span>+</span> 단장 후보자 등록' +
                        '</button>' +
                    '</div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">' +
                        '<!-- 1) 선거 방식 전환 스위치 -->' +
                        '<div class="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1.5">' +
                            '<div class="text-[11px] font-bold text-indigo-300 flex items-center justify-between">' +
                                '<span>선거 방식 전환</span>' +
                                '<span class="text-[10px] text-slate-400">현재: ' + (isSingle ? '단독 출마 찬반' : '다자 경선') + '</span>' +
                            '</div>' +
                            '<div class="grid grid-cols-2 gap-2">' +
                                '<button type="button" onclick="setElectionMode(\'single\')" class="py-2 px-2.5 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (isSingle ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' : 'bg-white/10 text-slate-300 hover:bg-white/20') + '">' +
                                    '✓ 단독 출마 찬반투표' +
                                '</button>' +
                                '<button type="button" onclick="setElectionMode(\'multi\')" class="py-2 px-2.5 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (!isSingle ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' : 'bg-white/10 text-slate-300 hover:bg-white/20') + '">' +
                                    '✓ 다자 경선 투표' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<!-- 2) 투표 상태 및 당선공고 제어 -->' +
                        '<div class="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1.5">' +
                            '<div class="text-[11px] font-bold text-amber-300 flex items-center justify-between">' +
                                '<span>선거 투표 마감 및 공고 제어</span>' +
                                '<span class="text-[10px] ' + (isClosed ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold') + '">' + (isClosed ? '🔒 투표 마감(의결 확정)' : '● 표결 진행중') + '</span>' +
                            '</div>' +
                            '<div class="grid grid-cols-2 gap-2">' +
                                '<button type="button" onclick="toggleElectionStatus()" class="py-2 px-2 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (isClosed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                                    (isClosed ? '🔓 투표 재개' : '🔒 단장 선거 마감 및 결과 확정') +
                                '</button>' +
                                '<button type="button" onclick="toggleWinnerPublic()" class="py-2 px-2 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (appState.winnerPagePublic ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600') + '">' +
                                    (appState.winnerPagePublic ? '📢 당선공고 전체공개 중' : '🔒 당선공고 비공개') +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            barCont.innerHTML = "";
        }
    }

    const singleBox = document.getElementById("electionSingleModeView");
    const multiBox = document.getElementById("electionMultiModeView");

    if (isSingle) {
        if (singleBox) singleBox.classList.remove("hidden");
        if (multiBox) multiBox.classList.add("hidden");

        const cand = (elec.candidates && elec.candidates.length > 0) ? elec.candidates[0] : null;
        if (cand) {
            const nameEl = document.getElementById("singleCandName");
            if (nameEl) nameEl.textContent = cand.name + " (" + cand.gen + " · " + cand.part + ")";
            const pledgeEl = document.getElementById("singleCandPledge");
            if (pledgeEl) pledgeEl.textContent = cand.pledge;
            const careerEl = document.getElementById("singleCandCareer");
            if (careerEl) careerEl.textContent = cand.career;
            const imgEl = document.getElementById("singleCandPhoto");
            if (imgEl && cand.photo) imgEl.src = cand.photo;

            // Single candidate admin buttons (수정 / 삭제)
            const adminSingleBtnEl = document.getElementById("singleCandAdminControls");
            if (adminSingleBtnEl) {
                if (isExec) {
                    adminSingleBtnEl.innerHTML = 
                        '<div class="flex items-center gap-1.5">' +
                            '<button type="button" onclick="openCandidateModal(\'' + cand.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer">✎ 후보 정보 수정</button>' +
                            '<button type="button" onclick="deleteCandidate(\'' + cand.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 후보 삭제</button>' +
                        '</div>';
                } else {
                    adminSingleBtnEl.innerHTML = '';
                }
            }
        }

        const appEl = document.getElementById("singleCandApproveCount");
        if (appEl) appEl.textContent = tallies.approve;
        const rejEl = document.getElementById("singleCandRejectCount");
        if (rejEl) rejEl.textContent = tallies.reject;
        const absEl = document.getElementById("singleCandAbstainCount");
        if (absEl) absEl.textContent = tallies.abstain;

        const myVote = (elec.singleVotes.memberVotes || {})[appState.currentVoterId];
        const statusEl = document.getElementById("myElectionVoteStatus");
        const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
        if (statusEl) {
            if (isClosed) {
                if (myVote) {
                    statusEl.innerHTML = '<span class="text-xs font-black text-purple-800">🔒 나의 최종 의결: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong> (확정)</span>';
                } else {
                    statusEl.innerHTML = '<span class="text-xs font-bold text-rose-600">🔒 단장 선거 투표가 공식 마감되었습니다.</span>';
                }
            } else {
                if (myVote) {
                    statusEl.innerHTML = '<span class="text-xs font-bold text-purple-700">✓ 단장 선거 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong></span>';
                } else {
                    statusEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 단장 선거에 투표하지 않으셨습니다. 아래 버튼을 눌러 투표하세요.</span>';
                }
            }
        }

        // Single vote action buttons container
        const btnBox = document.getElementById("singleElectionVoteButtonsContainer");
        if (btnBox) {
            if (isClosed) {
                btnBox.innerHTML = 
                    '<div class="col-span-3 p-4 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 text-center space-y-1">' +
                        '<div class="flex items-center justify-center gap-2 text-slate-800 font-black text-sm">' +
                            '<span class="text-base">🔒</span>' +
                            '<span>단장 선거 투표가 마감되었습니다 (변경 불가)</span>' +
                        '</div>' +
                        '<p class="text-xs text-slate-500 font-medium">2026년도 신임 단장 선출 의결권 행사가 공식 종료되어 결과가 확정되었습니다.</p>' +
                    '</div>';
            } else {
                const isApp = myVote === "approve";
                const isRej = myVote === "reject";
                const isAbs = myVote === "abstain";
                btnBox.innerHTML = 
                    '<button type="button" onclick="voteElectionSingle(\'approve\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isApp ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                        '후보 찬성' + (isApp ? ' (선택됨)' : '') +
                    '</button>' +
                    '<button type="button" onclick="voteElectionSingle(\'reject\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isRej ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                        '후보 반대' + (isRej ? ' (선택됨)' : '') +
                    '</button>' +
                    '<button type="button" onclick="voteElectionSingle(\'abstain\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isAbs ? 'bg-slate-800 text-white ring-2 ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white') + '">' +
                        '기권' + (isAbs ? ' (선택됨)' : '') +
                    '</button>';
            }
        }
    } else {
        if (singleBox) singleBox.classList.add("hidden");
        if (multiBox) multiBox.classList.remove("hidden");

        const cardsCont = document.getElementById("multiCandidatesGrid");
        if (cardsCont) {
            let html = "";
            const activeCands = getActiveCandidates();
            const myVote = (elec.multiMemberVotes || {})[appState.currentVoterId];

            activeCands.forEach(function(c) {
                const count = (tallies.counts && tallies.counts[c.id] !== undefined) ? tallies.counts[c.id] : (c.baseVotes || 0);
                const isSelected = myVote === c.id;

                const editBtnHtml = isExec ? 
                    ('<div class="flex items-center gap-1 shrink-0">' +
                        '<button type="button" onclick="openCandidateModal(\'' + c.id + '\')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 hover:bg-indigo-100 text-indigo-700 border border-slate-200 transition cursor-pointer">✎ 수정</button>' +
                        '<button type="button" onclick="deleteCandidate(\'' + c.id + '\')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                    '</div>') : '';

                const voteBtnHtml = isClosed ?
                    (isSelected 
                        ? '<span class="px-3 py-1 rounded-lg text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-300">🔒 최종 선택 (확정)</span>'
                        : '<span class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-400">🔒 투표 마감</span>') :
                    ('<button type="button" onclick="voteElectionMulti(\'' + c.id + '\')" class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ' +
                        (isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-purple-100') + '">' +
                        (isSelected ? '✓ 선택됨' : '투표하기') +
                    '</button>');

                html += '<div class="p-4 rounded-xl border ' + (isSelected ? 'border-2 border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-white') + ' shadow-xs space-y-3 flex flex-col justify-between">' +
                    '<div class="space-y-3">' +
                        '<div class="flex items-start justify-between gap-2">' +
                            '<div class="flex items-center gap-3">' +
                                '<img src="' + c.photo + '" alt="' + escapeHtml(c.name) + '" class="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" onerror="this.src=\'assets/cand_1.jpg\'">' +
                                '<div>' +
                                    '<h4 class="text-sm font-extrabold text-slate-900">' + escapeHtml(c.name) + ' <span class="text-xs text-slate-500 font-normal">(' + escapeHtml(c.gen) + ' · ' + escapeHtml(c.part) + ')</span></h4>' +
                                    '<p class="text-xs text-purple-700 font-semibold">' + escapeHtml(c.title || c.company || '') + '</p>' +
                                '</div>' +
                            '</div>' +
                            editBtnHtml +
                        '</div>' +
                        '<p class="text-xs text-slate-600 break-keep">' + escapeHtml(c.pledge) + '</p>' +
                        (c.career ? ('<p class="text-[11px] text-slate-400 break-keep">' + escapeHtml(c.career) + '</p>') : '') +
                    '</div>' +
                    '<div class="flex items-center justify-between pt-2 border-t border-slate-100">' +
                        '<span class="text-sm font-black text-slate-900">' + count + '표</span>' +
                        voteBtnHtml +
                    '</div>' +
                '</div>';
            });
            cardsCont.innerHTML = html || '<div class="col-span-3 text-center py-8 text-slate-400 text-xs">등록된 후보자가 없습니다. 운영진 관리 바에서 후보자를 추가해주세요.</div>';
        }
    }
}

function renderWinnerView() {
    const elec = appState.election;
    if (!elec) return;
    const tallies = getElectionTallies();
    const winner = tallies.winner || elec.candidates[0];

    const nameEl = document.getElementById("winnerCandidateName");
    if (nameEl) nameEl.textContent = winner.name;
    const titleEl = document.getElementById("winnerCandidateTitle");
    if (titleEl) titleEl.textContent = "2026 삼성한우리합창단 신임 단장 (" + winner.gen + " · " + winner.part + ")";
    const votesEl = document.getElementById("winnerVoteSummary");
    if (votesEl) {
        if (tallies.mode === "single") {
            votesEl.textContent = "찬성 " + tallies.approve + "표 / 반대 " + tallies.reject + "표 / 기권 " + tallies.abstain + "표 (득표율 " + Math.round((tallies.approve / Math.max(1, tallies.totalVoted)) * 100) + "%)";
        } else {
            votesEl.textContent = "최다 득표 " + tallies.topVotes + "표로 당선 확정";
        }
    }
}

function renderCurrentBylawsView() {
    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);

    // 단칙 헤더 운영진 제어 버튼
    const bHeader = document.getElementById("bylawsAdminHeaderControls");
    if (bHeader) {
        if (isExec) {
            bHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openEditClauseModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1 shrink-0 cursor-pointer">+ 조문 추가</button>';
        } else {
            bHeader.innerHTML = "";
        }
    }

    const uploadBtn = document.getElementById("btnBylawFileUpload");
    if (uploadBtn) {
        if (isExec) uploadBtn.classList.remove("hidden");
        else uploadBtn.classList.add("hidden");
    }

    const container = document.getElementById("currentBylawsClausesContainer");
    if (!container) return;
    const chFilter = appState.bylawViewerChapter || "all";
    const q = (appState.bylawSearchQuery || "").trim();

    const filtered = (appState.bylaws || []).filter(function(cl) {
        if (chFilter !== "all" && cl.chapter.indexOf(chFilter) === -1) return false;
        if (q) {
            return matchesSearch([cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
        }
        return true;
    });

    let html = "";
    filtered.forEach(function(cl) {
        const execControls = isExec
            ? '<div class="flex items-center gap-1.5 shrink-0">' +
                '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 조문 수정</button>' +
                '<button type="button" onclick="deleteClauseItem(\'' + cl.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
              '</div>'
            : '';

        html += '<div id="' + cl.id + '" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs space-y-2">' +
            '<div class="flex items-center justify-between gap-2">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">' + escapeHtml(cl.chapter) + '</span>' +
                    '<h4 class="text-sm font-extrabold text-slate-900">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</h4>' +
                '</div>' +
                execControls +
            '</div>' +
            '<div class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</div>' +
            (cl.lastAmended ? '<div class="text-[11px] text-slate-400">비고: ' + escapeHtml(cl.lastAmended) + '</div>' : '') +
        '</div>';
    });
    container.innerHTML = html || '<div class="text-center py-8 text-slate-400 text-xs">일치하는 단칙 조항이 없습니다.</div>';
}

function renderFullSearchView() {}
function renderDrawerSearchResults() {}

function renderAdminView() {
    const totalInp = document.getElementById("adminInputTotalAttendees");
    if (totalInp) totalInp.value = appState.totalAttendees;

    const winnerToggle = document.getElementById("adminWinnerPublicToggle");
    if (winnerToggle) winnerToggle.checked = Boolean(appState.winnerPagePublic);

    const modeSel = document.getElementById("adminElectionModeSelect");
    if (modeSel) modeSel.value = appState.election.mode;

    // 1. 식순 관리 리스트 (#adminScheduleListContainer)
    const schCont = document.getElementById("adminScheduleListContainer");
    if (schCont) {
        let schHtml = "";
        (appState.assemblySchedule || []).forEach(function(item) {
            const isDone = item.status === "완료";
            const isIng = item.status === "진행중";
            const statusBadge = isDone
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">완료</span>'
                : (isIng
                    ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse shrink-0">진행중</span>'
                    : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 shrink-0">' + escapeHtml(item.status) + '</span>');

            const tabBadge = item.targetTab
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 shrink-0">연결: ' + escapeHtml(item.targetTab) + ' (' + escapeHtml(item.btnLabel || "이동") + ')</span>'
                : '<span class="text-[11px] text-slate-400 shrink-0">(연결 없음)</span>';

            schHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">' +
                '<div class="flex items-start gap-3 min-w-0">' +
                    statusBadge +
                    '<div class="min-w-0">' +
                        '<div class="text-xs font-black text-slate-900 truncate">' + escapeHtml(item.title) + '</div>' +
                        '<div class="text-[11px] text-slate-500 mt-0.5 break-keep">' + escapeHtml(item.desc) + '</div>' +
                        '<div class="mt-1">' + tabBadge + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
                    '<button type="button" onclick="openScheduleModal(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteScheduleItem(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                '</div>' +
            '</div>';
        });
        schCont.innerHTML = schHtml || '<div class="text-center py-6 text-slate-400 text-xs">등록된 식순이 없습니다. 상단 [+ 식순 추가] 버튼을 눌러 추가하세요.</div>';
    }

    // 2. 연간 행사 타임라인 리스트 (#adminEventsTimelineList or #adminEventsListContainer)
    const evCont = document.getElementById("adminEventsTimelineList") || document.getElementById("adminEventsListContainer");
    if (evCont) {
        let evHtml = "";
        (appState.events || []).forEach(function(ev) {
            evHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col justify-between gap-2 shadow-xs">' +
                '<div>' +
                    '<div class="flex items-center justify-between gap-1">' +
                        '<span class="font-black text-xs text-indigo-950">' + escapeHtml(ev.title) + '</span>' +
                        '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">' + escapeHtml(ev.date) + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600 mt-1">' + escapeHtml(ev.desc) + '</p>' +
                    (ev.place ? '<p class="text-[11px] text-slate-400 mt-0.5">장소: ' + escapeHtml(ev.place) + '</p>' : '') +
                '</div>' +
                '<div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">' +
                    '<button type="button" onclick="openEditEventModal(\'' + ev.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteEventItem(\'' + ev.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                '</div>' +
            '</div>';
        });
        evCont.innerHTML = evHtml || '<div class="col-span-2 text-center py-6 text-slate-400 text-xs">등록된 연간 행사가 없습니다. 상단 [+ 행사 내역 추가] 버튼을 눌러 추가하세요.</div>';
    }

    // 3. 단칙 조문 관리 리스트 (#adminBylawsListContainer)
    const byCont = document.getElementById("adminBylawsListContainer");
    if (byCont) {
        const adminQ = (document.getElementById("adminBylawsSearchInput") ? document.getElementById("adminBylawsSearchInput").value : "").trim().toLowerCase();
        const filtered = (appState.bylaws || []).filter(function(cl) {
            if (!adminQ) return true;
            return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], adminQ);
        });

        let byHtml = "";
        filtered.forEach(function(cl) {
            byHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">' +
                '<div class="min-w-0 flex-1">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 shrink-0">' + escapeHtml(cl.chapter) + '</span>' +
                        '<span class="text-xs font-black text-slate-900">' + escapeHtml(cl.articleNo + " (" + cl.title + ")") + '</span>' +
                    '</div>' +
                    '<p class="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">' + escapeHtml(cl.content) + '</p>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
                    '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 조문 수정</button>' +
                    '<button type="button" onclick="deleteClauseItem(\'' + cl.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                '</div>' +
            '</div>';
        });
        byCont.innerHTML = byHtml || '<div class="text-center py-6 text-slate-400 text-xs">일치하는 단칙 조항이 없습니다.</div>';
    }

    // 4. 18인 운영진 명부 관리 (#adminExecutiveRosterTableBody)
    const execTbody = document.getElementById("adminExecutiveRosterTableBody");
    if (execTbody) {
        let execHtml = "";
        EXECUTIVE_ROSTER.forEach(function(exec, i) {
            execHtml += '<tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs">' +
                '<td class="py-2.5 px-3 text-center text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-800">' +
                    '<span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold mr-1.5 border border-rose-200">' + escapeHtml(exec.role) + '</span>' +
                    (exec.subRole && exec.subRole !== '-' ? '<span class="text-slate-500 font-normal">(' + escapeHtml(exec.subRole) + ')</span>' : '') +
                '</td>' +
                '<td class="py-2.5 px-3 font-extrabold text-slate-900">' + escapeHtml(exec.name) + '</td>' +
                '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(exec.gen) + '기</td>' +
                '<td class="py-2.5 px-3">' +
                    '<span class="font-semibold text-slate-700">' + escapeHtml(exec.part) + '</span>' +
                    (exec.detailPart ? '<span class="text-slate-400 text-[11px] ml-1">(' + escapeHtml(exec.detailPart) + ')</span>' : '') +
                '</td>' +
                '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(exec.company) + '</td>' +
                '<td class="py-2.5 px-3 text-slate-500 text-[11px] font-mono">' + escapeHtml(exec.email) + '</td>' +
                '<td class="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">' +
                    '<span class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">' + escapeHtml(exec.code || '2003') + '</span>' +
                '</td>' +
            '</tr>';
        });
        execTbody.innerHTML = execHtml;
    }
}

function renderAuthModalMemberList() {
    const container = document.getElementById("authMemberListGrid");
    if (!container) return;
    const activeAg = getActiveAgenda();
    const votesMap = activeAg.memberVotes || {};
    const fKey = appState.authModalFilter || "all";
    const q = (appState.authModalSearch || "").trim().toLowerCase();

    ["all", "exec", "소프라노", "알토", "테너", "베이스"].forEach(function(k) {
        const btn = document.getElementById("btnAuthFilter-" + k);
        if (!btn) return;
        if (k === fKey) {
            btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white";
        } else {
            btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50";
        }
    });

    const filtered = appState.members.filter(function(m) {
        if (fKey === "exec" && !m.isExecutive) return false;
        if (fKey !== "all" && fKey !== "exec" && m.basePart !== fKey) return false;
        if (q) {
            const hay = (m.name + " " + m.basePart + " " + m.part + " " + m.company).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    });

    if (pendingExecMemberId) {
        const pm = appState.members.find(function(x) { return x.id === pendingExecMemberId; });
        const label = document.getElementById("execAuthTargetLabel");
        if (pm && label) {
            label.textContent = pm.name + " (" + pm.basePart + ") 단원 본인 확인 — 휴대폰 뒷 4자리 입력";
        }
    }

    let html = "";
    filtered.forEach(function(m) {
        const isSelected = m.id === appState.currentVoterId;
        const votedChoice = votesMap[m.id];
        const statusBadge = votedChoice
            ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">투표완료</span>'
            : '';

        html += '<button type="button" onclick="selectVoter(\'' + m.id + '\')" class="p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1 ' +
            (isSelected ? 'border-2 border-indigo-600 bg-indigo-50/70' : 'border-slate-200 hover:bg-slate-50') + '">' +
            '<div class="min-w-0">' +
                '<div class="text-xs font-extrabold text-slate-900 truncate">' +
                    escapeHtml(m.name) + ' <span class="text-slate-500 font-semibold">(' + escapeHtml(m.basePart) + ')</span>' +
                '</div>' +
                '<div class="text-[11px] text-slate-400 truncate">' + escapeHtml(m.company) + '</div>' +
            '</div>' +
            statusBadge +
        '</button>';
    });
    container.innerHTML = html;
}
