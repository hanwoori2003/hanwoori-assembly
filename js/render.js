// 4. DOM 렌더링 및 UI 바인딩 모듈 (js/render.js)

function renderHeaderStatus() {
    const majority = getMajorityThreshold(appState.totalAttendees);
    const totalEl = document.getElementById("headerTotalAttendees");
    if (totalEl) totalEl.textContent = appState.totalAttendees + "명";
    const majEl = document.getElementById("headerMajorityThreshold");
    if (majEl) majEl.textContent = majority + "표↑";

    const voter = getCurrentVoter();
    const rolePrefix = (voter.isExecutive && appState.isAdminAuthenticated) ? "★운영진 · " : "";
    const voterPartStr = voter.detailPart ? (voter.part + " · " + voter.detailPart) : voter.part;
    const voterBadgeStr = rolePrefix + voter.name + " (" + voterPartStr + ")";

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

    // 투표 현황 네비게이션 배지
    const curAg = getActiveAgenda();
    const curIdx = appState.agendas.findIndex(function(a) { return a.id === curAg.id; }) + 1;
    const navProg = document.getElementById("navBadgeAgendaProgress");
    if (navProg) navProg.textContent = curIdx + "/" + appState.agendas.length;

    const navElec = document.getElementById("navBadgeElectionMode");
    if (navElec) {
        navElec.textContent = appState.election.mode === "single" ? "단독 찬반" : "다자 경선";
    }

    // 운영진 전용 탭 표시 제어 (단장 당선 공고, 메리고잉 운영진 제어)
    const winnerBtn = document.getElementById("tabBtn-winner");
    if (winnerBtn) {
        if (appState.isAdminAuthenticated || appState.winnerPagePublic) {
            winnerBtn.classList.remove("hidden");
            winnerBtn.classList.add("flex");
        } else {
            winnerBtn.classList.add("hidden");
            winnerBtn.classList.remove("flex");
        }
    }

    const adminBtn = document.getElementById("tabBtn-admin");
    if (adminBtn) {
        if (appState.isAdminAuthenticated) {
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
    const container = document.getElementById("assemblyScheduleListContainer");
    if (!container) return;
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
            ? '<button type="button" onclick="switchMainTab(\'' + item.targetTab + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition shrink-0">' + escapeHtml(item.btnLabel || "이동 ->") + '</button>'
            : '';

        html += '<div class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
            '<div class="flex items-start gap-3 min-w-0">' +
                statusBadge +
                '<div class="min-w-0">' +
                    '<h4 class="text-sm font-extrabold text-slate-900 truncate">' + escapeHtml(item.title) + '</h4>' +
                    '<p class="text-xs text-slate-600 mt-0.5 break-keep">' + escapeHtml(item.desc) + '</p>' +
                '</div>' +
            '</div>' +
            jumpBtn +
        '</div>';
    });
    container.innerHTML = html;

    // 연간 행사 목록 렌더링
    const evCont = document.getElementById("annualEventsListContainer");
    if (evCont) {
        let evHtml = "";
        (appState.events || []).forEach(function(ev) {
            evHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
                '<div class="min-w-0">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="font-extrabold text-xs text-indigo-900">' + escapeHtml(ev.title) + '</span>' +
                        '<span class="text-[11px] text-slate-500 font-semibold">' + escapeHtml(ev.date) + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600 mt-0.5">' + escapeHtml(ev.desc) + ' <span class="text-slate-400">(' + escapeHtml(ev.place) + ')</span></p>' +
                '</div>' +
            '</div>';
        });
        evCont.innerHTML = evHtml;
    }
}

function renderConcertFeedbackView() {
    const survey = appState.concertSurvey;
    if (!survey) return;

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
    const container = document.getElementById("agendaStepperContainer");
    if (!container) return;
    let html = "";
    appState.agendas.forEach(function(ag, i) {
        const isActive = ag.id === appState.activeAgendaId;
        const tallies = getAgendaTallies(ag);
        const hasVoted = Boolean((ag.memberVotes || {})[appState.currentVoterId]);
        const badge = hasVoted
            ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>'
            : '';

        html += '<button type="button" onclick="selectAgenda(\'' + ag.id + '\')" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ' +
            (isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50') + '">' +
            '<span>안건 ' + ag.no + '</span>' +
            badge +
        '</button>';
    });
    container.innerHTML = html;
}

function renderActiveVotingView() {
    const ag = getActiveAgenda();
    if (!ag) return;
    const tallies = getAgendaTallies(ag);
    const myVote = (ag.memberVotes || {})[appState.currentVoterId];

    const titleEl = document.getElementById("activeAgendaTitle");
    if (titleEl) titleEl.textContent = ag.title;
    const catEl = document.getElementById("activeAgendaCategory");
    if (catEl) catEl.textContent = ag.category + " · " + ag.author;
    const descEl = document.getElementById("activeAgendaSummary");
    if (descEl) descEl.textContent = ag.summary;
    const reasonEl = document.getElementById("activeAgendaReason");
    if (reasonEl) reasonEl.textContent = ag.proposalReason;
    const beforeEl = document.getElementById("activeAgendaBefore");
    if (beforeEl) beforeEl.textContent = ag.beforeText;
    const afterEl = document.getElementById("activeAgendaAfter");
    if (afterEl) afterEl.textContent = ag.afterText;

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
        if (tallies.isAdopted) {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200";
            statusEl.textContent = "가결 확정 (2/3 정족수 충족)";
        } else {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200";
            statusEl.textContent = "표결 진행 중 (가결 기준: " + tallies.majorityThreshold + "표↑)";
        }
    }

    // My vote indicator
    const myVoteEl = document.getElementById("myVoteStatusNotice");
    if (myVoteEl) {
        if (myVote) {
            const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
            myVoteEl.innerHTML = '<span class="text-xs font-bold text-indigo-700">✓ 본인 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong>로 의결권을 행사하셨습니다.</span>';
        } else {
            myVoteEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 본 안건에 투표하지 않으셨습니다. 아래 버튼을 눌러 투표하세요.</span>';
        }
    }
}

function renderElectionView() {
    const elec = appState.election;
    if (!elec) return;
    const tallies = getElectionTallies();
    const isSingle = elec.mode === "single";

    const singleBox = document.getElementById("electionSingleModeView");
    const multiBox = document.getElementById("electionMultiModeView");

    if (isSingle) {
        if (singleBox) singleBox.classList.remove("hidden");
        if (multiBox) multiBox.classList.add("hidden");

        const cand = elec.candidates[0];
        const nameEl = document.getElementById("singleCandName");
        if (nameEl) nameEl.textContent = cand.name + " (" + cand.gen + " · " + cand.part + ")";
        const pledgeEl = document.getElementById("singleCandPledge");
        if (pledgeEl) pledgeEl.textContent = cand.pledge;
        const careerEl = document.getElementById("singleCandCareer");
        if (careerEl) careerEl.textContent = cand.career;

        const appEl = document.getElementById("singleCandApproveCount");
        if (appEl) appEl.textContent = tallies.approve;
        const rejEl = document.getElementById("singleCandRejectCount");
        if (rejEl) rejEl.textContent = tallies.reject;
        const absEl = document.getElementById("singleCandAbstainCount");
        if (absEl) absEl.textContent = tallies.abstain;

        const myVote = (elec.singleVotes.memberVotes || {})[appState.currentVoterId];
        const statusEl = document.getElementById("myElectionVoteStatus");
        if (statusEl) {
            if (myVote) {
                const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
                statusEl.innerHTML = '<span class="text-xs font-bold text-purple-700">✓ 단장 선거 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong></span>';
            } else {
                statusEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 단장 선거에 투표하지 않으셨습니다.</span>';
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
                const count = tallies.counts[c.id] || 0;
                const isSelected = myVote === c.id;
                html += '<div class="p-4 rounded-xl border ' + (isSelected ? 'border-2 border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-white') + ' shadow-xs space-y-3">' +
                    '<div class="flex items-center gap-3">' +
                        '<img src="' + c.photo + '" alt="' + escapeHtml(c.name) + '" class="w-12 h-12 rounded-full object-cover border border-slate-200" onerror="this.src=\'assets/cand_1.jpg\'">' +
                        '<div>' +
                            '<h4 class="text-sm font-extrabold text-slate-900">' + escapeHtml(c.name) + ' <span class="text-xs text-slate-500 font-normal">(' + escapeHtml(c.gen) + ' · ' + escapeHtml(c.part) + ')</span></h4>' +
                            '<p class="text-xs text-purple-700 font-semibold">' + escapeHtml(c.title) + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600">' + escapeHtml(c.pledge) + '</p>' +
                    '<div class="flex items-center justify-between pt-2 border-t border-slate-100">' +
                        '<span class="text-sm font-black text-slate-900">' + count + '표</span>' +
                        '<button type="button" onclick="voteElectionMulti(\'' + c.id + '\')" class="px-3 py-1 rounded-lg text-xs font-bold ' +
                            (isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-purple-100') + '">' +
                            (isSelected ? '선택됨' : '투표하기') +
                        '</button>' +
                    '</div>' +
                '</div>';
            });
            cardsCont.innerHTML = html;
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
        html += '<div id="' + cl.id + '" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs space-y-2">' +
            '<div class="flex items-center justify-between gap-2">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">' + escapeHtml(cl.chapter) + '</span>' +
                    '<h4 class="text-sm font-extrabold text-slate-900">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</h4>' +
                '</div>' +
            '</div>' +
            '<div class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</div>' +
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
