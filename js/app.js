// 3. 애플리케이션 렌더링, 검색, 투표 집계, 운영진 패스워드 인증 및 모달 제어 로직
let appState = getDefaultState();

    // Persistence & Cloud Sync Helpers
    function saveStateToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          totalAttendees: appState.totalAttendees,
          activeAgendaId: appState.activeAgendaId,
          uploadedFileName: appState.uploadedFileName,
          currentVoterId: appState.currentVoterId,
          isAdminAuthenticated: appState.isAdminAuthenticated,
          members: appState.members,
          bylaws: appState.bylaws,
          agendas: appState.agendas,
          election: appState.election,
          issues: appState.issues,
          events: appState.events,
          assemblySchedule: appState.assemblySchedule,
          winnerPagePublic: appState.winnerPagePublic
        }));
      } catch (e) {}
      pushStateToCloudIfConnected();
    }

    function loadStateFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.agendas) && Array.isArray(parsed.bylaws)) {
            appState.totalAttendees = parsed.totalAttendees || 127;
            appState.activeAgendaId = parsed.activeAgendaId || "ag-1";
            appState.uploadedFileName = parsed.uploadedFileName || appState.uploadedFileName;
            appState.currentVoterId = parsed.currentVoterId || appState.currentVoterId;
            appState.isAdminAuthenticated = Boolean(parsed.isAdminAuthenticated);
            if (Array.isArray(parsed.members) && parsed.members.length >= 100) {
              appState.members = parsed.members;
            }
            appState.bylaws = parsed.bylaws;
            appState.agendas = parsed.agendas;
            if (parsed.election) appState.election = parsed.election;
            appState.issues = parsed.issues || appState.issues;
            appState.events = parsed.events || appState.events;
            if (Array.isArray(parsed.assemblySchedule)) appState.assemblySchedule = parsed.assemblySchedule;
            appState.winnerPagePublic = Boolean(parsed.winnerPagePublic);
          }
        }
        const savedUrl = localStorage.getItem(STORAGE_KEY + "_db_url");
        if (savedUrl) {
          cloudSyncUrl = savedUrl;
          const inp = document.getElementById("inputFirebaseDbUrl");
          if (inp) inp.value = savedUrl;
          startCloudSyncPolling();
        }
      } catch (e) {}
    }

    function resetToDefaultInitialData() {
      appState = getDefaultState();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      switchMainTab("events");
      renderAll();
      closeCloudSyncModal();
      showToast("첨부된 전체 단원 명부(134명), 2026 운영진(18명), 단칙(32개 조항) 및 실제 개정안(12건) 초기 데이터로 복원되었습니다.");
    }

    // =========================================================================
    // 2. .DOCX / .TXT / .MD BYLAW FILE UPLOAD & AUTO-PARSER
    // =========================================================================

    function triggerBylawFileUpload() {
      const inp = document.getElementById("hiddenBylawUploadInput");
      if (inp) {
        inp.value = "";
        inp.click();
      }
    }

    function parseRawBylawLinesIntoClauses(lines) {
      const chapterRe = /^(제\s*\d+\s*장\s*.+)$/;
      const articleRe = /^(제\s*(\d+)\s*조)\s*(?:\\(([^)]+)\\))?\s*(.*)$/;
      const clauses = [];
      let currentChapter = "제1장 총칙";
      let currentArticle = null;

      lines.forEach(function(rawLine) {
        const line = rawLine.replace(/\s+/g, " ").trim();
        if (!line) return;
        const mCh = line.match(chapterRe);
        if (mCh) {
          currentChapter = mCh[1].replace(/\s+/g, " ").trim();
          return;
        }
        const mArt = line.match(articleRe);
        if (mArt) {
          if (currentArticle) clauses.push(currentArticle);
          const artNum = "제" + mArt[2] + "조";
          const artTitle = (mArt[3] || "부칙").trim();
          const rest = (mArt[4] || "").trim();
          currentArticle = {
            id: "cl-" + mArt[2] + "-" + (clauses.length + 1),
            chapter: currentChapter,
            articleNo: artNum,
            title: artTitle,
            contentLines: rest ? [rest] : [],
            lastAmended: ""
          };
        } else if (currentArticle) {
          currentArticle.contentLines.push(line);
        }
      });

      if (currentArticle) clauses.push(currentArticle);

      const kwCandidates = [
        "정단원", "준단원", "휴단원", "명예단원", "특별단원",
        "단장", "부단장", "운영진", "지휘자", "반주자", "파트장",
        "정기총회", "임시총회", "쉐도우 보팅", "정기연주회", "출석률",
        "오디션", "정기회비", "행사회비", "연회비", "환불",
        "대외활동", "수익", "회계", "개정", "비상상황"
      ];

      clauses.forEach(function(c) {
        const joined = [];
        c.contentLines.forEach(function(l) {
          if (joined.length === 0) {
            joined.push(l);
          } else if (/^([①②③④⑤⑥⑦⑧⑨⑩]|[가나다라마바사]\\.|\-\s|\\([가-힣\s]+\\)|본 단칙은)/.test(l)) {
            joined.push("\n" + l);
          } else {
            joined[joined.length - 1] = joined[joined.length - 1] + " " + l;
          }
        });
        c.content = joined.join("").trim();
        delete c.contentLines;

        const kws = [c.articleNo, c.title];
        kwCandidates.forEach(function(cand) {
          if ((c.content.indexOf(cand) !== -1 || c.title.indexOf(cand) !== -1) && kws.indexOf(cand) === -1) {
            kws.push(cand);
          }
        });
        c.keywords = kws.slice(0, 8);
      });

      return clauses;
    }

    function handleBylawFileUpload(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file) return;
      const fileName = file.name;
      const lower = fileName.toLowerCase();

      if (lower.endsWith(".docx")) {
        if (typeof JSZip === "undefined") {
          showToast("DOCX 파서 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          JSZip.loadAsync(evt.target.result)
            .then(function(zip) {
              const docXmlFile = zip.file("word/document.xml");
              if (!docXmlFile) {
                throw new Error("word/document.xml not found");
              }
              return docXmlFile.async("string");
            })
            .then(function(xmlText) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "application/xml");
              const paragraphs = xmlDoc.getElementsByTagName("w:p");
              const lines = [];
              for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                const tNodes = p.getElementsByTagName("w:t");
                const parts = [];
                for (let j = 0; j < tNodes.length; j++) {
                  const tNode = tNodes[j];
                  let parent = tNode.parentNode;
                  let inDel = false;
                  while (parent && parent !== p) {
                    if (parent.nodeName === "w:del") {
                      inDel = true;
                      break;
                    }
                    parent = parent.parentNode;
                  }
                  if (!inDel && tNode.textContent) {
                    parts.push(tNode.textContent);
                  }
                }
                const lineStr = parts.join("").replace(/\s+/g, " ").trim();
                if (lineStr) lines.push(lineStr);
              }
              const parsedClauses = parseRawBylawLinesIntoClauses(lines);
              if (parsedClauses.length > 0) {
                appState.bylaws = parsedClauses;
                appState.uploadedFileName = fileName;
                saveStateToStorage();
                switchMainTab("bylaws");
                renderAll();
                showToast("‘" + fileName + "’ 업로드 완료! 총 " + parsedClauses.length + "개 단칙 조항이 [현재 단칙 보기] 및 [단칙 검색] 화면에 반영되었습니다.");
              } else {
                showToast("파일에서 ‘제1조’ 형식의 단칙 조항을 찾지 못했습니다.");
              }
            })
            .catch(function() {
              showToast("DOCX 단칙 파일 분석 중 오류가 발생했습니다.");
            });
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const text = evt.target.result || "";
          const lines = text.split(/\r?\n/);
          const parsedClauses = parseRawBylawLinesIntoClauses(lines);
          if (parsedClauses.length > 0) {
            appState.bylaws = parsedClauses;
            appState.uploadedFileName = fileName;
            saveStateToStorage();
            switchMainTab("bylaws");
            renderAll();
            showToast("‘" + fileName + "’ 업로드 완료! 총 " + parsedClauses.length + "개 조항이 반영되었습니다.");
          } else {
            showToast("텍스트에서 ‘제1조’ 형식의 조항을 찾지 못했습니다.");
          }
        };
        reader.readAsText(file, "utf-8");
      }
    }

    // =========================================================================
    // 3. CORE HELPER FUNCTIONS (단칙 제30조 2/3 찬성 가결 기준 지원)
    // =========================================================================

    function getMajorityThreshold(total) {
      // 단칙 제30조 제1항: 투표권을 가진 회원 2/3 이상의 찬성으로써 개정할 수 있다. (예: 37명->25표, 38명->26표, 36명->24표)
      return Math.ceil((total * 2) / 3);
    }

    function getAgendaTallies(agenda) {
      let approve = agenda.baseApprove;
      let reject = agenda.baseReject;
      let abstain = agenda.baseAbstain;
      const votesMap = agenda.memberVotes || {};
      Object.keys(votesMap).forEach(function(memId) {
        const choice = votesMap[memId];
        if (choice === "approve") approve += 1;
        else if (choice === "reject") reject += 1;
        else if (choice === "abstain") abstain += 1;
      });
      const totalVoted = approve + reject + abstain;
      const baseTotal = agenda.voterTotal || appState.totalAttendees;
      const totalAttendees = Math.max(baseTotal, totalVoted);
      const majorityThreshold = agenda.passThreshold && totalVoted === (agenda.baseApprove + agenda.baseReject + agenda.baseAbstain)
        ? agenda.passThreshold
        : getMajorityThreshold(totalAttendees);
      const isAdopted = approve >= majorityThreshold;
      return {
        approve: approve,
        reject: reject,
        abstain: abstain,
        totalVoted: totalVoted,
        remaining: Math.max(0, totalAttendees - totalVoted),
        totalAttendees: totalAttendees,
        majorityThreshold: majorityThreshold,
        isAdopted: isAdopted
      };
    }

    function normalizeArticleQuery(rawQuery) {
      if (!rawQuery) return "";
      const trimmed = rawQuery.trim();
      const match = trimmed.match(/^(?:제\s*)?(\d+)\s*조/);
      if (match) {
        return "제" + match[1] + "조";
      }
      return trimmed;
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function highlightMatch(text, rawQuery) {
      const safeText = escapeHtml(text);
      if (!rawQuery || !rawQuery.trim()) return safeText;
      const q = rawQuery.trim();
      const norm = normalizeArticleQuery(q);
      const patterns = [];
      if (norm && norm !== q) {
        patterns.push(norm.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"));
      }
      patterns.push(q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"));
      const regex = new RegExp("(" + patterns.join("|") + ")", "gi");
      return safeText.replace(regex, '<mark class="hl">$1</mark>');
    }

    function matchesSearch(itemTextArray, rawQuery) {
      if (!rawQuery || !rawQuery.trim()) return true;
      const q = rawQuery.trim().toLowerCase();
      const norm = normalizeArticleQuery(q).toLowerCase();
      const noSpaceQ = q.replace(/\s+/g, "");
      const combined = itemTextArray.join(" ").toLowerCase();
      const noSpaceCombined = combined.replace(/\s+/g, "");
      return (
        combined.indexOf(q) !== -1 ||
        (norm && combined.indexOf(norm) !== -1) ||
        (noSpaceQ && noSpaceCombined.indexOf(noSpaceQ) !== -1)
      );
    }

    function getCurrentVoter() {
      return appState.members.find(function(m) { return m.id === appState.currentVoterId; }) || appState.members[0];
    }

    function getActiveAgenda() {
      return appState.agendas.find(function(a) { return a.id === appState.activeAgendaId; }) || appState.agendas[0];
    }

    // =========================================================================
    // 4. RENDER FUNCTIONS
    // =========================================================================

    function renderAll() {
      renderHeaderStatus();
      renderExecutiveRosterTable();
      renderFullMemberRosterTable();
      renderEventsView();
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

        function setTotalAttendeesPreset(count) {
      appState.totalAttendees = count;
      saveStateToStorage();
      renderAll();
      if (count === 127) {
        showToast("정기총회 공식 성원 인원인 127명(현장참석 39명 + 쉐도우보팅 94명) 기준으로 설정되었습니다.");
      } else if (count === 134) {
        showToast("2026 전체 인원 명부 등록 인원인 134명 기준으로 설정되었습니다.");
      } else {
        showToast("단칙 개정안 현장 카페 투표 인원(37명) 기준으로 설정되었습니다.");
      }
    }

    function renderHeaderStatus() {
      const majority = getMajorityThreshold(appState.totalAttendees);
      document.getElementById("headerTotalAttendees").textContent = appState.totalAttendees + "명";
      document.getElementById("headerMajorityThreshold").textContent = majority + "표↑";
      const subNote = document.getElementById("headerAttendanceSubNote");
      if (subNote) {
        if (appState.totalAttendees === 127) {
          subNote.textContent = "(현장 39 + 쉐도우보팅 94 / 재적 164명)";
        } else if (appState.totalAttendees === 134) {
          subNote.textContent = "(2026 전체 인원 명부 134명 전원)";
        } else if (appState.totalAttendees >= 36 && appState.totalAttendees <= 39) {
          subNote.textContent = "(현장 카페 실투표 참여 인원 기준)";
        } else {
          subNote.textContent = "(운영진 설정 참석 인원)";
        }
      }

      const voter = getCurrentVoter();
      const rolePrefix = (voter.isExecutive && appState.isAdminAuthenticated) ? "★운영진 · " : "";
      document.getElementById("currentVoterBadgeText").textContent =
        rolePrefix + voter.name + " (" + voter.part + ")";

      // 운영진 로그인 여부에 따라 상단 [메리고잉 운영진 제어] 및 [단장 당선 공고] 탭 표시/숨김 제어
      const isExecLoggedIn = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      const adminTabBtn = document.getElementById("tabBtn-admin");
      const winnerTabBtn = document.getElementById("tabBtn-winner");
      const heroWinnerBtn = document.getElementById("heroBtnWinnerPage");

      if (adminTabBtn) {
        if (isExecLoggedIn) adminTabBtn.classList.remove("hidden");
        else adminTabBtn.classList.add("hidden");
      }
      if (winnerTabBtn) {
        if (isExecLoggedIn || appState.winnerPagePublic) winnerTabBtn.classList.remove("hidden");
        else winnerTabBtn.classList.add("hidden");
      }
      if (heroWinnerBtn) {
        if (isExecLoggedIn || appState.winnerPagePublic) heroWinnerBtn.classList.remove("hidden");
        else heroWinnerBtn.classList.add("hidden");
      }
      if (!isExecLoggedIn && (appState.activeTab === "admin" || (appState.activeTab === "winner" && !appState.winnerPagePublic))) {
        appState.activeTab = "events";
        ["admin", "winner"].forEach(function(hidTab) {
          const sec = document.getElementById("view-" + hidTab);
          if (sec) sec.classList.add("hidden");
        });
        const evSec = document.getElementById("view-events");
        if (evSec) evSec.classList.remove("hidden");
      }

      const activeAgenda = getActiveAgenda();
      document.getElementById("navBadgeAgendaProgress").textContent =
        activeAgenda.orderNo + "/" + appState.agendas.length;

      const clauseBadge = document.getElementById("navBadgeClauseTotal");
      if (clauseBadge && appState.bylaws.length > 0) {
        clauseBadge.textContent = "제1조~" + appState.bylaws[appState.bylaws.length - 1].articleNo;
      }
      const fileStatus = document.getElementById("uploadedFileStatusBadge");
      if (fileStatus) {
        fileStatus.textContent = (appState.uploadedFileName || "단칙") + " · 총 " + appState.bylaws.length + "개 조항 수록";
      }
      const viewerBadge = document.getElementById("bylawViewerFileBadge");
      if (viewerBadge) {
        viewerBadge.textContent = (appState.uploadedFileName || "단칙") + " · 총 " + appState.bylaws.length + "개 조항";
      }
    }

    function renderExecutiveRosterTable() {
      const tbody = document.getElementById("executiveRosterTableBody");
      if (!tbody) return;
      let html = "";
      EXECUTIVE_ROSTER.forEach(function(r) {
        let rowBg = "bg-white";
        let companyBadge = "";
        if (r.groupType === "samsung_elec") {
          rowBg = "bg-blue-50/50";
          companyBadge = '<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs">' + escapeHtml(r.company) + '</span>';
        } else if (r.groupType === "non_samsung") {
          rowBg = "bg-slate-100/90";
          companyBadge = '<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-xs">비삼성</span>';
        } else {
          companyBadge = '<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold text-xs">' + escapeHtml(r.company) + '</span>';
        }

        html += '<tr class="' + rowBg + ' hover:bg-indigo-50/50 transition">' +
          '<td class="py-2.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(r.role) + '</td>' +
          '<td class="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">' + escapeHtml(r.subRole) + '</td>' +
          '<td class="py-2.5 px-3 font-extrabold text-indigo-950 whitespace-nowrap">' + escapeHtml(r.name) + '</td>' +
          '<td class="py-2.5 px-3 text-center font-mono font-bold text-slate-700">' + escapeHtml(r.gen) + '기</td>' +
          '<td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 rounded bg-white border border-slate-200 font-extrabold text-xs text-slate-800">' + escapeHtml(r.detailPart) + '</span></td>' +
          '<td class="py-2.5 px-3 whitespace-nowrap">' + companyBadge + '</td>' +
          '<td class="py-2.5 px-3 font-mono text-xs text-slate-600">' + (r.email !== "-" ? escapeHtml(r.email) : '<span class="text-slate-400">-</span>') + '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function formatAttCell(val) {
      if (!val || val === "-") return '<span class="text-slate-300">-</span>';
      if (val.indexOf("출석 1") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      if (val.indexOf("지각") !== -1 || val.indexOf("조퇴") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      return '<span class="text-slate-600 text-[11px]">' + escapeHtml(val) + '</span>';
    }

    function renderFullMemberRosterTable() {
      const tbody = document.getElementById("fullMemberRosterTableBody");
      if (!tbody) return;
      const partFilter = appState.rosterPartFilter || "all";
      const q = (appState.rosterSearchQuery || "").trim().toLowerCase();

      ["all", "소프라노", "알토", "테너", "베이스"].forEach(function(pf) {
        const btn = document.getElementById("btnRosterFilter-" + pf);
        if (!btn) return;
        if (pf === partFilter) {
          btn.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white";
        } else {
          btn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50";
        }
      });

      const sorted = appState.members.slice().sort(function(a, b) {
        return (a.rowNo || 999) - (b.rowNo || 999);
      });

      const filtered = sorted.filter(function(m) {
        if (partFilter !== "all" && m.basePart !== partFilter) return false;
        if (q) {
          const hay = (m.name + " " + m.basePart + " " + m.part + " " + (m.key || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      let html = "";
      filtered.forEach(function(m) {
        const isCurrent = m.id === appState.currentVoterId;
        const roleBadge = m.isExecutive
          ? '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[11px]">★ ' + escapeHtml(m.execRole) + '</span>'
          : '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[11px]">정단원</span>';

        html += '<tr class="' + (isCurrent ? 'bg-indigo-50/70' : 'hover:bg-slate-50') + '">' +
          '<td class="py-2 px-3 font-mono text-slate-400">' + (m.rowNo || "-") + '</td>' +
          '<td class="py-2 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(m.name) + '</td>' +
          '<td class="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">' + escapeHtml(m.basePart) + '</td>' +
          '<td class="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">' + escapeHtml(m.key || (m.name + "-" + m.basePart)) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + roleBadge + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0307) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0314) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0321) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0328) + '</td>' +
          '<td class="py-2 px-3 text-right whitespace-nowrap">' +
            (isCurrent
              ? '<span class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">현재 로그인</span>'
              : m.isExecutive
                ? '<button type="button" onclick="promptExecutiveLoginFromOutside(\'' + m.id + '\')" class="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px]">운영진 로그인(PW)</button>'
                : '<button type="button" onclick="selectVoter(\'' + m.id + '\')" class="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px]">이름으로 로그인</button>') +
          '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function handleRosterTableSearch(val) {
      appState.rosterSearchQuery = val;
      renderFullMemberRosterTable();
    }

    function setRosterPartFilter(pf) {
      appState.rosterPartFilter = pf;
      renderFullMemberRosterTable();
    }

    // =========================================================================
    // 5. CURRENT BYLAWS VIEWER (현재 단칙 보기 전용 탭)
    // =========================================================================

    function setBylawViewerChapter(ch) {
      appState.bylawViewerChapter = ch;
      renderCurrentBylawsView();
    }

    function handleBylawIntegratedSearch(val) {
      appState.bylawSearchQuery = val;
      const inp = document.getElementById("bylawIntegratedSearchInput");
      if (inp && inp.value !== val) inp.value = val;
      renderCurrentBylawsView();
    }

    function clearBylawIntegratedSearch() {
      appState.bylawSearchQuery = "";
      appState.bylawViewerChapter = "all";
      const inp = document.getElementById("bylawIntegratedSearchInput");
      if (inp) inp.value = "";
      renderCurrentBylawsView();
    }

    function renderCurrentBylawsView() {
      const container = document.getElementById("currentBylawsDocumentContainer");
      if (!container) return;
      const filterCh = appState.bylawViewerChapter || "all";
      const q = (appState.bylawSearchQuery || "").trim();

      ["all", "제1장", "제2장", "제3장", "제4장", "제5장", "제6장", "제9장"].forEach(function(chKey) {
        const btn = document.getElementById("btnChFilter-" + chKey);
        if (!btn) return;
        if (chKey === filterCh) {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white";
        } else {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-amber-50 text-slate-700";
        }
      });

      const clauses = appState.bylaws.filter(function(cl) {
        if (filterCh !== "all" && cl.chapter.indexOf(filterCh) === -1) return false;
        if (q) {
          return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
        }
        return true;
      });

      let html = "";
      if (clauses.length === 0) {
        html = '<div class="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">검색하신 키워드나 조항 번호와 일치하는 단칙 조문이 없습니다.</div>';
      } else {
        let currentCh = "";
        clauses.forEach(function(cl) {
          if (cl.chapter !== currentCh) {
            currentCh = cl.chapter;
            html += '<div class="pt-4 first:pt-0">' +
              '<h4 class="text-base sm:text-lg font-extrabold text-indigo-950 bg-indigo-50/80 border-l-4 border-indigo-600 px-4 py-2 rounded-r-xl">' + highlightMatch(currentCh, q) + '</h4>' +
            '</div>';
          }

          html += '<div class="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 transition hover:border-indigo-300 hover:bg-white">' +
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
              '<div class="flex flex-wrap items-center gap-2">' +
                '<span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-extrabold">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-1.5">' +
                '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 text-xs font-bold text-slate-700">✎ 조문 수정</button>' +
              '</div>' +
            '</div>' +
            '<div class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line pl-1">' + highlightMatch(cl.content, q) + '</div>' +
          '</div>';
        });
      }

      container.innerHTML = html;
    }

    function getActiveCandidates() {
      const elec = appState.election;
      const count = elec.mode === "single" ? 1 : Math.max(2, elec.activeCandidateCount || 2);
      return elec.candidates.slice(0, count);
    }

    function getElectionTallies() {
      const elec = appState.election;
      if (elec.mode === "single") {
        let approve = elec.singleVotes.approve;
        let reject = elec.singleVotes.reject;
        let abstain = elec.singleVotes.abstain;
        const mv = elec.singleVotes.memberVotes || {};
        Object.keys(mv).forEach(function(mid) {
          if (mv[mid] === "approve") approve += 1;
          else if (mv[mid] === "reject") reject += 1;
          else if (mv[mid] === "abstain") abstain += 1;
        });
        const totalVoted = approve + reject + abstain;
        const totalPool = Math.max(elec.totalVoters || 38, totalVoted);
        const passThreshold = Math.ceil((totalPool * 2) / 3);
        const isElected = approve >= passThreshold;
        return {
          mode: "single",
          approve: approve,
          reject: reject,
          abstain: abstain,
          totalVoted: totalVoted,
          totalPool: totalPool,
          passThreshold: passThreshold,
          isElected: isElected,
          winner: elec.candidates[0]
        };
      } else {
        const cands = getActiveCandidates();
        const counts = {};
        cands.forEach(function(c) { counts[c.id] = c.baseVotes || 0; });
        const mv = elec.multiMemberVotes || {};
        Object.keys(mv).forEach(function(mid) {
          const cid = mv[mid];
          if (counts[cid] !== undefined) counts[cid] += 1;
        });
        let totalVoted = 0;
        let topCand = cands[0];
        let topVotes = -1;
        cands.forEach(function(c) {
          const v = counts[c.id] || 0;
          totalVoted += v;
          if (v > topVotes) {
            topVotes = v;
            topCand = c;
          }
        });
        const totalPool = Math.max(elec.totalVoters || 38, totalVoted);
        return {
          mode: "multi",
          counts: counts,
          totalVoted: totalVoted,
          totalPool: totalPool,
          topVotes: topVotes,
          winner: topCand
        };
      }
    }

    function setElectionModeAndCount(mode, count) {
      appState.election.mode = mode;
      appState.election.activeCandidateCount = count;
      saveStateToStorage();
      renderAll();
      if (mode === "single") {
        showToast("단장 선거가 [1인 단독 출마 · 찬반 투표] 모드로 전환되었습니다.");
      } else {
        showToast("단장 선거가 [" + count + "인 경선 · 후보자 다자 투표] 모드로 전환되었습니다.");
      }
    }

    function castPresidentVote(choiceOrCandId) {
      const voter = getCurrentVoter();
      const elec = appState.election;
      if (elec.mode === "single") {
        if (!elec.singleVotes.memberVotes) elec.singleVotes.memberVotes = {};
        if (elec.singleVotes.memberVotes[voter.id]) {
          showToast("이미 단장 찬반 투표에 참여하셨습니다. (1인 1표)");
          return;
        }
        elec.singleVotes.memberVotes[voter.id] = choiceOrCandId;
        const label = choiceOrCandId === "approve" ? "찬성" : choiceOrCandId === "reject" ? "반대" : "기권";
        saveStateToStorage();
        renderAll();
        showToast(voter.name + " 단원님의 단장 후보 [" + label + "] 투표가 반영되었습니다!");
      } else {
        if (!elec.multiMemberVotes) elec.multiMemberVotes = {};
        if (elec.multiMemberVotes[voter.id]) {
          showToast("이미 단장 경선 투표에 참여하셨습니다. (1인 1표)");
          return;
        }
        elec.multiMemberVotes[voter.id] = choiceOrCandId;
        const cand = elec.candidates.find(function(c) { return c.id === choiceOrCandId; });
        saveStateToStorage();
        renderAll();
        showToast(voter.name + " 단원님의 [기호 " + (cand ? cand.number : "") + "번 " + (cand ? cand.name : "") + "] 후보 투표가 집계되었습니다!");
      }
    }

    function simulateElectionVote() {
      const elec = appState.election;
      if (elec.mode === "single") {
        elec.singleVotes.approve += 1;
      } else {
        const cands = getActiveCandidates();
        cands[0].baseVotes = (cands[0].baseVotes || 0) + 1;
      }
      saveStateToStorage();
      renderAll();
      showToast("현장 단장 투표 1표가 추가 시뮬레이션되었습니다.");
    }

    function finalizeElectionAndGoWinner() {
      appState.election.status = "elected";
      const voter = getCurrentVoter();
      const isExec = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      if (isExec) {
        appState.winnerPagePublic = true;
        saveStateToStorage();
        switchMainTab("winner");
        const t = getElectionTallies();
        showToast("단장 투표 마감 및 당선 공고 오픈 완료! [" + t.winner.name + "] 단장 당선 공고 페이지로 이동합니다.");
      } else {
        saveStateToStorage();
        renderAll();
        showToast("투표 결과가 집계되었습니다. 단장 당선 공고 페이지는 운영진 확인 후 오픈됩니다.");
      }
    }

    function triggerCandidatePhotoUpload(candId) {
      pendingPhotoCandidateId = candId;
      const inp = document.getElementById("hiddenCandidatePhotoInput");
      if (inp) {
        inp.value = "";
        inp.click();
      }
    }

    function handleCandidatePhotoFile(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file || !pendingPhotoCandidateId) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const cand = appState.election.candidates.find(function(c) { return c.id === pendingPhotoCandidateId; });
        if (cand && evt.target.result) {
          cand.photo = evt.target.result;
          saveStateToStorage();
          renderAll();
          showToast(cand.name + " 후보자의 프로필 사진이 업데이트되었습니다!");
        }
      };
      reader.readAsDataURL(file);
    }

    function openCandidateModal(candId) {
      const m = document.getElementById("candidateModal");
      const cand = candId ? appState.election.candidates.find(function(c) { return c.id === candId; }) : null;
      document.getElementById("editCandidateId").value = cand ? cand.id : "";
      document.getElementById("candInputName").value = cand ? cand.name : "";
      document.getElementById("candInputMeta").value = cand ? cand.meta : "18기 · 알토(A1) · 삼성전자";
      document.getElementById("candInputSlogan").value = cand ? cand.slogan : "";
      document.getElementById("candInputCareer").value = cand ? (cand.career || []).join("\n") : "";
      document.getElementById("candInputPledge").value = cand ? cand.pledge : "";
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeCandidateModal() {
      const m = document.getElementById("candidateModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveCandidateModal() {
      const editId = document.getElementById("editCandidateId").value;
      const name = (document.getElementById("candInputName").value || "").trim();
      const meta = (document.getElementById("candInputMeta").value || "").trim();
      const slogan = (document.getElementById("candInputSlogan").value || "").trim() || "화합과 감동의 삼성한우리합창단";
      const careerRaw = (document.getElementById("candInputCareer").value || "").trim();
      const pledge = (document.getElementById("candInputPledge").value || "").trim();

      if (!name) {
        showToast("후보자 성명을 입력해 주세요.");
        return;
      }
      const careerList = careerRaw ? careerRaw.split(/\r?\n/).map(function(s) { return s.trim(); }).filter(Boolean) : ["삼성한우리합창단 정단원 및 운영진 활동"];

      if (editId) {
        const cand = appState.election.candidates.find(function(c) { return c.id === editId; });
        if (cand) {
          cand.name = name;
          cand.meta = meta;
          cand.slogan = slogan;
          cand.career = careerList;
          cand.pledge = pledge;
        }
        showToast(name + " 후보자 이력 및 공약이 수정되었습니다.");
      } else {
        const newNum = appState.election.candidates.length + 1;
        appState.election.candidates.push({
          id: "cand-" + newNum,
          number: newNum,
          name: name,
          meta: meta,
          photo: appState.election.candidates[0].photo,
          slogan: slogan,
          career: careerList,
          pledge: pledge,
          baseVotes: 3
        });
        appState.election.mode = "multi";
        appState.election.activeCandidateCount = appState.election.candidates.length;
        showToast("기호 " + newNum + "번 " + name + " 후보가 추가되어 다자 경선 모드로 전환되었습니다.");
      }
      closeCandidateModal();
      saveStateToStorage();
      renderAll();
    }

    function renderElectionView() {
      const elec = appState.election;
      const cands = getActiveCandidates();
      const tallies = getElectionTallies();
      const voter = getCurrentVoter();

      const headerBadge = document.getElementById("electionHeaderModeBadge");
      const navBadge = document.getElementById("navBadgeElectionMode");
      if (elec.mode === "single") {
        if (headerBadge) headerBadge.textContent = "단독 후보 출마 (찬반 투표 모드)";
        if (navBadge) navBadge.textContent = "단독 찬반";
      } else {
        if (headerBadge) headerBadge.textContent = cands.length + "인 경선 출마 (후보자 다자 투표 모드)";
        if (navBadge) navBadge.textContent = cands.length + "인 경선";
      }

      [1, 2, 3].forEach(function(n) {
        const btn = document.getElementById("btnElecMode-" + n);
        if (!btn) return;
        const active = (n === 1 && elec.mode === "single") || (n > 1 && elec.mode === "multi" && cands.length === n);
        btn.className = active
          ? "px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 shadow-xs"
          : "px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white";
      });

      // Render Candidate Cards with Photo, Career, and Pledges
      const listEl = document.getElementById("electionCandidatesListContainer");
      if (listEl) {
        let cHtml = "";
        cands.forEach(function(c) {
          const careerItems = (c.career || []).map(function(line) {
            return '<li class="flex items-start gap-1.5"><span class="text-purple-600 font-bold">•</span><span>' + escapeHtml(line) + '</span></li>';
          }).join("");

          cHtml += '<div class="bg-white rounded-2xl shadow-sm border-2 border-slate-200 hover:border-purple-400 transition p-5 sm:p-6">' +
            '<div class="flex flex-col sm:flex-row items-start gap-5">' +
              '<div class="flex flex-col items-center gap-2 shrink-0">' +
                '<div class="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-purple-100 shadow-md bg-slate-100">' +
                  '<img src="' + c.photo + '" alt="' + escapeHtml(c.name) + ' 후보 사진" class="w-full h-full object-cover" />' +
                '</div>' +
                '<div class="flex gap-1">' +
                  '<button type="button" onclick="triggerCandidatePhotoUpload(\'' + c.id + '\')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-800 border border-slate-300 text-[11px] font-bold">📷 사진 변경</button>' +
                  '<button type="button" onclick="openCandidateModal(\'' + c.id + '\')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-300 text-[11px] font-bold">✎ 이력 편집</button>' +
                '</div>' +
              '</div>' +
              '<div class="flex-1 space-y-3 min-w-0">' +
                '<div class="flex flex-wrap items-center justify-between gap-2">' +
                  '<div>' +
                    '<span class="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-extrabold">' +
                      (elec.mode === "single" ? "단독 입후보" : "기호 " + c.number + "번 후보") +
                    '</span>' +
                    '<h4 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">' + escapeHtml(c.name) + ' <span class="text-xs sm:text-sm font-semibold text-slate-500">(' + escapeHtml(c.meta) + ')</span></h4>' +
                  '</div>' +
                '</div>' +
                '<div class="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs sm:text-sm font-extrabold text-purple-950">' +
                  '“' + escapeHtml(c.slogan) + '”' +
                '</div>' +
                '<div>' +
                  '<div class="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">합창단 활동 및 운영진 주요 이력 (제11조 제3항 자격 충족)</div>' +
                  '<ul class="text-xs sm:text-sm text-slate-700 space-y-1">' + careerItems + '</ul>' +
                '</div>' +
                '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80">' +
                  '<div class="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">핵심 공약 및 운영 비전</div>' +
                  '<p class="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">' + escapeHtml(c.pledge) + '</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        });
        listEl.innerHTML = cHtml;
      }

      // Voter banner in election tab
      document.getElementById("elecVoterAvatar").textContent = voter.name.charAt(0);
      document.getElementById("elecVoterName").textContent = voter.name + " 단원";
      document.getElementById("elecVoterSub").textContent = voter.part;

      const ballotTitle = document.getElementById("electionBallotBoxTitle");
      const ballotBtns = document.getElementById("electionBallotButtonsContainer");
      const voterStatus = document.getElementById("elecVoterStatusBadge");

      if (elec.mode === "single") {
        const cand = cands[0];
        const myVote = (elec.singleVotes.memberVotes || {})[voter.id];
        if (ballotTitle) ballotTitle.textContent = cand.name + " 단장 후보 찬반 투표";
        if (voterStatus) {
          voterStatus.innerHTML = myVote
            ? '<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">투표완료</span>'
            : '<span class="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-200 text-xs font-bold">투표가능</span>';
        }
        if (ballotBtns) {
          ballotBtns.innerHTML =
            '<div class="grid grid-cols-3 gap-2.5">' +
              '<button type="button" onclick="castPresidentVote(\'approve\')" class="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-600 text-emerald-950 hover:text-white font-extrabold text-sm transition flex flex-col items-center gap-1">' +
                '<span class="text-base">찬성</span><span class="text-[11px] opacity-80">' + escapeHtml(cand.name) + ' 후보 선출</span>' +
              '</button>' +
              '<button type="button" onclick="castPresidentVote(\'reject\')" class="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50 hover:bg-rose-600 text-rose-950 hover:text-white font-extrabold text-sm transition flex flex-col items-center gap-1">' +
                '<span class="text-base">반대</span><span class="text-[11px] opacity-80">선출 반대</span>' +
              '</button>' +
              '<button type="button" onclick="castPresidentVote(\'abstain\')" class="p-4 rounded-2xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-700 text-slate-800 hover:text-white font-extrabold text-sm transition flex flex-col items-center gap-1">' +
                '<span class="text-base">기권</span><span class="text-[11px] opacity-80">의결권 유보</span>' +
              '</button>' +
            '</div>';
        }
      } else {
        const myVote = (elec.multiMemberVotes || {})[voter.id];
        if (ballotTitle) ballotTitle.textContent = cands.length + "인 경선 후보자 선택 투표 (1인 1표)";
        if (voterStatus) {
          voterStatus.innerHTML = myVote
            ? '<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">투표완료</span>'
            : '<span class="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-200 text-xs font-bold">투표가능</span>';
        }
        if (ballotBtns) {
          let bHtml = "";
          cands.forEach(function(c) {
            const selected = myVote === c.id;
            bHtml += '<button type="button" onclick="castPresidentVote(\'' + c.id + '\')" class="w-full p-3.5 rounded-2xl border-2 ' +
              (selected ? 'border-purple-600 bg-purple-600 text-white' : 'border-purple-200 bg-purple-50/50 hover:bg-purple-600 hover:border-purple-600 text-slate-900 hover:text-white') +
              ' transition flex items-center justify-between gap-3">' +
              '<div class="flex items-center gap-3 text-left">' +
                '<img src="' + c.photo + '" alt="' + escapeHtml(c.name) + '" class="w-10 h-10 rounded-xl object-cover border border-white/40" />' +
                '<div>' +
                  '<div class="text-xs font-bold opacity-80">기호 ' + c.number + '번</div>' +
                  '<div class="text-sm sm:text-base font-extrabold">' + escapeHtml(c.name) + ' 후보 선택</div>' +
                '</div>' +
              '</div>' +
              '<span class="px-3 py-1 rounded-xl bg-white/20 text-xs font-extrabold">투표하기 ✓</span>' +
            '</button>';
          });
          ballotBtns.innerHTML = bHtml;
        }
      }

      // Render Election Tally Bars
      const tallyEl = document.getElementById("electionTallyBarsContainer");
      const verdictEl = document.getElementById("electionVerdictBadge");
      if (elec.mode === "single") {
        const appPct = tallies.totalPool > 0 ? ((tallies.approve / tallies.totalPool) * 100) : 0;
        const rejPct = tallies.totalPool > 0 ? ((tallies.reject / tallies.totalPool) * 100) : 0;
        const absPct = tallies.totalPool > 0 ? ((tallies.abstain / tallies.totalPool) * 100) : 0;

        if (verdictEl) {
          verdictEl.innerHTML = tallies.isElected
            ? '<span class="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs">✓ ' + escapeHtml(tallies.winner.name) + ' 후보 당선 확정</span>'
            : '<span class="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-xs">투표 진행중</span>';
        }
        if (tallyEl) {
          tallyEl.innerHTML =
            '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">' +
              '<span>총 투표 참여: <strong>' + tallies.totalVoted + '명</strong></span>' +
              '<span>2/3 당선 기준: <strong class="text-purple-700">' + tallies.passThreshold + '표 이상</strong></span>' +
            '</div>' +
            '<div>' +
              '<div class="flex justify-between text-xs font-bold mb-1"><span class="text-emerald-700">찬성 (' + escapeHtml(tallies.winner.name) + ' 선출 동의)</span><span>' + tallies.approve + '표 (' + appPct.toFixed(1) + '%)</span></div>' +
              '<div class="h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:' + Math.min(100, appPct).toFixed(1) + '%"></div></div>' +
            '</div>' +
            '<div>' +
              '<div class="flex justify-between text-xs font-bold mb-1"><span class="text-rose-700">반대</span><span>' + tallies.reject + '표 (' + rejPct.toFixed(1) + '%)</span></div>' +
              '<div class="h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-rose-500 rounded-full" style="width:' + Math.min(100, rejPct).toFixed(1) + '%"></div></div>' +
            '</div>' +
            '<div>' +
              '<div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-600">기권</span><span>' + tallies.abstain + '표 (' + absPct.toFixed(1) + '%)</span></div>' +
              '<div class="h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400 rounded-full" style="width:' + Math.min(100, absPct).toFixed(1) + '%"></div></div>' +
            '</div>';
        }
      } else {
        if (verdictEl) {
          verdictEl.innerHTML = '<span class="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs">1위 당선: 기호 ' + tallies.winner.number + '번 ' + escapeHtml(tallies.winner.name) + '</span>';
        }
        if (tallyEl) {
          let tHtml = '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">' +
            '<span>경선 총 투표수: <strong>' + tallies.totalVoted + '표</strong></span>' +
            '<span>최다 득표자: <strong class="text-purple-700">' + escapeHtml(tallies.winner.name) + ' (' + tallies.topVotes + '표)</strong></span>' +
          '</div>';
          cands.forEach(function(c) {
            const v = tallies.counts[c.id] || 0;
            const pct = tallies.totalVoted > 0 ? ((v / tallies.totalVoted) * 100) : 0;
            const isWin = c.id === tallies.winner.id;
            tHtml += '<div>' +
              '<div class="flex justify-between text-xs font-bold mb-1">' +
                '<span class="' + (isWin ? 'text-purple-800 font-extrabold' : 'text-slate-700') + '">기호 ' + c.number + '번 ' + escapeHtml(c.name) + (isWin ? ' ★당선권' : '') + '</span>' +
                '<span>' + v + '표 (' + pct.toFixed(1) + '%)</span>' +
              '</div>' +
              '<div class="h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ' + (isWin ? 'bg-purple-600' : 'bg-slate-400') + ' rounded-full" style="width:' + Math.min(100, pct).toFixed(1) + '%"></div></div>' +
            '</div>';
          });
          tallyEl.innerHTML = tHtml;
        }
      }
    }

    function renderWinnerView() {
      const container = document.getElementById("winnerAnnouncementContainer");
      if (!container) return;
      const tallies = getElectionTallies();
      const winner = tallies.winner;
      const voteSummary = tallies.mode === "single"
        ? "단독 출마 찬반투표 · 총 " + tallies.totalVoted + "표 중 찬성 " + tallies.approve + "표 (" + ((tallies.approve / Math.max(1, tallies.totalVoted)) * 100).toFixed(1) + "% 찬성 가결)"
        : getActiveCandidates().length + "인 경선 투표 · 총 " + tallies.totalVoted + "표 중 최다 득표 " + tallies.topVotes + "표 (" + ((tallies.topVotes / Math.max(1, tallies.totalVoted)) * 100).toFixed(1) + "% 득표 1위)";

      const careerHtml = (winner.career || []).map(function(line) {
        return '<li class="flex items-start gap-2"><span class="text-amber-500 font-extrabold">✓</span><span>' + escapeHtml(line) + '</span></li>';
      }).join("");

      container.innerHTML =
        '<div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl border-2 border-amber-400/50 relative overflow-hidden">' +
          '<div class="flex flex-col lg:flex-row items-center gap-8">' +
            '<div class="flex flex-col items-center shrink-0">' +
              '<div class="relative">' +
                '<div class="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl bg-slate-800">' +
                  '<img src="' + winner.photo + '" alt="' + escapeHtml(winner.name) + ' 당선자 사진" class="w-full h-full object-cover" />' +
                '</div>' +
                '<span class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg whitespace-nowrap">' +
                  '🏆 2026 단장 당선인' +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex-1 space-y-4 text-center lg:text-left">' +
              '<div class="flex flex-wrap items-center justify-center lg:justify-start gap-2">' +
                '<span class="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-extrabold">OFFICIAL CERTIFICATE OF ELECTION · 제2026대 단장 당선 공고</span>' +
                '<span class="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">' + escapeHtml(voteSummary) + '</span>' +
              '</div>' +
              '<h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight">' +
                '제2026대 삼성한우리합창단 단장 <span class="text-amber-300">' + escapeHtml(winner.name) + '</span> 당선' +
              '</h2>' +
              '<p class="text-sm sm:text-base text-indigo-200 font-semibold">' + escapeHtml(winner.meta) + ' · 임기: 2026. 01. 01 ~ 2026. 12. 31 (단칙 제11조)</p>' +
              '<div class="p-4 rounded-2xl bg-white/10 border border-white/15 text-left space-y-2">' +
                '<div class="text-xs font-extrabold text-amber-300 uppercase tracking-wider">당선인 취임 인사 및 2026 슬로건</div>' +
                '<p class="text-sm sm:text-base font-bold text-white leading-relaxed">' +
                  '“올해는 <strong>‘메리고잉 한우리’</strong>를 주제로 한 해를 이어가고자 합니다. 안산시립합창단 지휘자 박지훈 선생님, 그리고 18인의 메리고잉 운영진과 함께 모든 단원이 행복하게 화음을 맞추는 2026년을 만들겠습니다. 잘 부탁드립니다!”' +
                '</p>' +
              '</div>' +
              '<div class="flex flex-wrap justify-center lg:justify-start gap-2 pt-1">' +
                '<button type="button" onclick="switchMainTab(\'election\')" class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold">← 단장 선거 투표소로 돌아가기</button>' +
                '<button type="button" onclick="switchMainTab(\'events\')" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold">2026 정기총회 메인 현황 보기 →</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">' +
          '<div class="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">' +
            '<span class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-extrabold">WINNER CAREER &amp; PLEDGES</span>' +
            '<h3 class="text-lg font-extrabold text-slate-900">' + escapeHtml(winner.name) + ' 신임 단장 주요 이력 및 공약</h3>' +
            '<ul class="text-xs sm:text-sm text-slate-700 space-y-2">' + careerHtml + '</ul>' +
            '<div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">' +
              escapeHtml(winner.pledge) +
            '</div>' +
          '</div>' +
          '<div class="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">' +
            '<div class="flex items-center justify-between">' +
              '<div>' +
                '<span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-extrabold">2026 MERRY-GOING LEADERSHIP</span>' +
                '<h3 class="text-lg font-extrabold text-slate-900 mt-1">제2026대 메리고잉 삼성한우리합창단 운영진 인준 명단 (18인)</h3>' +
              '</div>' +
              '<span class="text-xs font-bold text-slate-500">지휘: 박지훈 선생님</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">' +
              EXECUTIVE_ROSTER.map(function(e) {
                const rLabel = e.subRole !== "-" ? e.subRole + " 파트장" : e.role;
                return '<div class="p-3 rounded-xl border border-slate-200 bg-slate-50/70">' +
                  '<div class="font-bold text-indigo-700">' + escapeHtml(rLabel) + '</div>' +
                  '<div class="text-sm font-extrabold text-slate-900 mt-0.5">' + escapeHtml(e.name) + ' <span class="text-xs font-semibold text-slate-500">(' + escapeHtml(e.gen) + '기·' + escapeHtml(e.detailPart) + ')</span></div>' +
                  '<div class="text-[11px] text-slate-500">' + escapeHtml(e.company) + '</div>' +
                '</div>';
              }).join("") +
            '</div>' +
          '</div>' +
        '</div>';
    }

    // =========================================================================
    // 7. VOTING VIEW & AGENDA STEPPER RENDERING
    // =========================================================================

    function renderAgendaStepper() {
      const container = document.getElementById("agendaStepperList");
      if (!container) return;
      let html = "";
      appState.agendas.forEach(function(ag) {
        const isCurrent = ag.id === appState.activeAgendaId;
        const tallies = getAgendaTallies(ag);
        let statusTag = "";
        if (ag.status === "adopted") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 whitespace-nowrap">가결</span>';
        } else if (ag.status === "rejected") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 whitespace-nowrap">부결</span>';
        } else if (ag.status === "active") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 whitespace-nowrap">투표중</span>';
        } else {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">대기</span>';
        }

        const cardBorder = isCurrent
          ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-xs"
          : "border border-slate-200 bg-white hover:bg-slate-50";

        html += '<button type="button" onclick="selectAgenda(\'' + ag.id + '\')" class="text-left p-2.5 rounded-xl transition flex flex-col justify-between ' + cardBorder + '">' +
          '<div class="flex items-center justify-between gap-1 w-full">' +
            '<span class="text-xs font-extrabold whitespace-nowrap ' + (isCurrent ? 'text-indigo-700' : 'text-slate-700') + '">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</span>' +
            statusTag +
          '</div>' +
          '<div class="text-[11px] font-bold text-slate-600 truncate mt-0.5">' + escapeHtml(ag.targetArticle) + '</div>' +
          '<div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between w-full">' +
            '<span>찬성 ' + tallies.approve + '(' + tallies.majorityThreshold + ')</span>' +
            '<span class="whitespace-nowrap ' + (tallies.isAdopted ? 'text-emerald-600 font-bold' : 'text-rose-500 font-semibold') + '">' + (tallies.isAdopted ? '가결' : '부결') + '</span>' +
          '</div>' +
        '</button>';
      });
      container.innerHTML = html;
    }

    function renderActiveVotingView() {
      const ag = getActiveAgenda();
      const tallies = getAgendaTallies(ag);
      const voter = getCurrentVoter();
      const existingVote = (ag.memberVotes || {})[voter.id] || null;

      document.getElementById("activeAgendaOrderBadge").textContent = ag.codeName || ("제" + ag.orderNo + "호 안건");
      const typeBadge = document.getElementById("activeAgendaTypeBadge");
      typeBadge.textContent = ag.type === "신규안" ? "신규 신설안" : "단칙 개정안";
      typeBadge.className = ag.type === "신규안"
        ? "px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 font-extrabold text-xs whitespace-nowrap"
        : "px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs whitespace-nowrap";

      const propBadge = document.getElementById("activeAgendaProposerBadge");
      if (propBadge) {
        propBadge.textContent = "발의자: " + (ag.proposer || "운영진");
      }

      document.getElementById("activeAgendaTargetArticle").textContent = ag.targetArticle;
      document.getElementById("activeAgendaTitle").textContent = ag.title;
      document.getElementById("activeAgendaReason").textContent = ag.reason;

      const statusBadgeEl = document.getElementById("activeAgendaStatusBadge");
      if (ag.status === "adopted") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-xs whitespace-nowrap">✓ 투표 결과: 가결 (2/3 이상 찬성)</span>';
      } else if (ag.status === "rejected") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-xs whitespace-nowrap">✕ 투표 결과: 부결 (2/3 정족수 미달)</span>';
      } else if (ag.status === "active") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 animate-pulse whitespace-nowrap">● 현재 상정 · 실시간 투표 진행중</span>';
      } else {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200 whitespace-nowrap">상정 대기 (즉시 투표 가능)</span>';
      }

      document.getElementById("compareBeforeClauseLabel").textContent = ag.targetArticle;
      document.getElementById("compareAfterClauseLabel").textContent = ag.targetArticle;
      document.getElementById("compareAfterBadge").textContent = ag.type === "신규안" ? "변경 (신설 조문)" : "변경 (개정 조문)";
      document.getElementById("activeAgendaBeforeText").textContent = ag.beforeText;
      document.getElementById("activeAgendaAfterText").textContent = ag.afterText;

      let kwHtml = '<span class="text-xs font-bold text-slate-400 mr-1">관련 조항·키워드:</span>';
      (ag.keywords || []).forEach(function(kw) {
        kwHtml += '<button type="button" onclick="openDrawerWithQuery(\'' + escapeHtml(kw) + '\')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition">#' + escapeHtml(kw) + '</button>';
      });
      document.getElementById("activeAgendaKeywordsList").innerHTML = kwHtml;

      renderRelatedIssuesForActiveAgenda(ag);

      document.getElementById("voterAvatarCircle").textContent = voter.name.charAt(0);
      document.getElementById("voterPanelName").textContent = voter.name + " 단원";
      document.getElementById("voterPanelPart").textContent = voter.part;
      document.getElementById("voterPanelCode").textContent = "KEY: " + (voter.key || voter.name) + " · 안건당 1인 1표 제한";

      const voterBadgeEl = document.getElementById("voterCurrentAgendaBadge");
      const lockTextEl = document.getElementById("voteLockNoticeText");
      const btnApprove = document.getElementById("btnVoteApprove");
      const btnReject = document.getElementById("btnVoteReject");
      const btnAbstain = document.getElementById("btnVoteAbstain");

      const choiceMapKor = { approve: "찬성", reject: "반대", abstain: "기권" };

      if (existingVote) {
        voterBadgeEl.innerHTML = '<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold whitespace-nowrap">투표 완료 (' + choiceMapKor[existingVote] + ')</span>';
        lockTextEl.innerHTML = '<strong class="text-indigo-700">' + escapeHtml(voter.name) + '</strong> 님은 이 안건에 <strong>[' + choiceMapKor[existingVote] + ']</strong> 표를 행사하셨습니다.';
      } else {
        voterBadgeEl.innerHTML = '<span class="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold whitespace-nowrap">미투표 (투표 가능)</span>';
        lockTextEl.textContent = escapeHtml(voter.name) + " 단원 명의로 찬성·반대·기권 중 1표를 행사할 수 있습니다.";
      }

      [
        { btn: btnApprove, key: "approve" },
        { btn: btnReject, key: "reject" },
        { btn: btnAbstain, key: "abstain" }
      ].forEach(function(item) {
        if (item.key === "approve") {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "approve"
              ? "border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-600 hover:border-emerald-600 text-emerald-900 hover:text-white");
        } else if (item.key === "reject") {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "reject"
              ? "border-rose-600 bg-rose-600 text-white ring-4 ring-rose-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-rose-200 bg-rose-50/50 hover:bg-rose-600 hover:border-rose-600 text-rose-900 hover:text-white");
        } else {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "abstain"
              ? "border-slate-700 bg-slate-700 text-white ring-4 ring-slate-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-slate-200 bg-slate-50 hover:bg-slate-700 hover:border-slate-700 text-slate-800 hover:text-white");
        }
      });

      document.getElementById("statTotalAttendees").textContent = tallies.totalAttendees + "명";
      document.getElementById("statMajorityRequired").textContent = tallies.majorityThreshold + "표↑";
      document.getElementById("statVotedCount").textContent = tallies.totalVoted + "명";
      document.getElementById("statRemainingCount").textContent = tallies.remaining + "명";

      const approvePct = tallies.totalAttendees > 0 ? ((tallies.approve / tallies.totalAttendees) * 100) : 0;
      const rejectPct = tallies.totalAttendees > 0 ? ((tallies.reject / tallies.totalAttendees) * 100) : 0;
      const abstainPct = tallies.totalAttendees > 0 ? ((tallies.abstain / tallies.totalAttendees) * 100) : 0;

      document.getElementById("majorityApprovalBar").style.width = Math.min(100, approvePct).toFixed(1) + "%";
      document.getElementById("majorityMarkerLabel").textContent = "▲ 2/3 가결선 (" + tallies.majorityThreshold + "표)";
      document.getElementById("majorityMaxLabel").textContent = tallies.totalAttendees + "표 (100%)";

      const verdictPill = document.getElementById("decisionVerdictPill");
      const subtextEl = document.getElementById("majorityProgressSubtext");

      if (tallies.isAdopted) {
        verdictPill.innerHTML = '<span class="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold flex items-center gap-1 whitespace-nowrap">✓ 결과: 가결 (' + tallies.approve + '/' + tallies.majorityThreshold + '표)</span>';
        subtextEl.textContent = "찬성 " + tallies.approve + "표 (" + approvePct.toFixed(1) + "%) — 2/3 가결 기준(" + tallies.majorityThreshold + "표) 충족!";
        subtextEl.className = "font-extrabold text-emerald-400";
      } else {
        const needed = tallies.majorityThreshold - tallies.approve;
        verdictPill.innerHTML = '<span class="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-extrabold whitespace-nowrap">✕ 결과: 부결 (가결선 ' + needed + '표 부족)</span>';
        subtextEl.textContent = "찬성 " + tallies.approve + "표 (" + approvePct.toFixed(1) + "%) · 2/3 가결 기준(" + tallies.majorityThreshold + "표)에 " + needed + "표 미달";
        subtextEl.className = "font-bold text-amber-300";
      }

      document.getElementById("barLabelApprove").textContent = tallies.approve + "표 (" + approvePct.toFixed(1) + "%)";
      document.getElementById("barFillApprove").style.width = Math.min(100, approvePct).toFixed(1) + "%";

      document.getElementById("barLabelReject").textContent = tallies.reject + "표 (" + rejectPct.toFixed(1) + "%)";
      document.getElementById("barFillReject").style.width = Math.min(100, rejectPct).toFixed(1) + "%";

      document.getElementById("barLabelAbstain").textContent = tallies.abstain + "표 (" + abstainPct.toFixed(1) + "%)";
      document.getElementById("barFillAbstain").style.width = Math.min(100, abstainPct).toFixed(1) + "%";
    }

    function renderRelatedIssuesForActiveAgenda(activeAgenda) {
      const container = document.getElementById("relatedIssuesAndAgendasContainer");
      const activeClauseSet = new Set(activeAgenda.relatedClauses || []);
      const activeKwSet = new Set(activeAgenda.keywords || []);

      const matchedIssues = appState.issues.filter(function(iss) {
        if ((iss.relatedAgendas || []).indexOf(activeAgenda.id) !== -1) return true;
        return (iss.relatedClauses || []).some(function(c) { return activeClauseSet.has(c); });
      });

      const matchedAgendas = appState.agendas.filter(function(other) {
        if (other.id === activeAgenda.id) return false;
        const shareClause = (other.relatedClauses || []).some(function(c) { return activeClauseSet.has(c); });
        const shareKw = (other.keywords || []).some(function(k) { return activeKwSet.has(k); });
        return shareClause || shareKw;
      });

      const matchedClauses = appState.bylaws.filter(function(cl) {
        return activeClauseSet.has(cl.articleNo);
      });

      let html = "";

      matchedIssues.forEach(function(iss) {
        html += '<div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
          '<div class="space-y-1">' +
            '<div class="flex flex-wrap items-center gap-1.5">' +
              '<span class="px-2 py-0.5 rounded bg-amber-500 text-white text-[11px] font-extrabold">' + escapeHtml(iss.code) + '</span>' +
              '<span class="text-xs font-bold text-amber-900">연관 조항: ' + escapeHtml((iss.relatedClauses || []).join(", ")) + '</span>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + escapeHtml(iss.title) + '</div>' +
            '<p class="text-xs text-slate-700 leading-relaxed">' + escapeHtml(iss.summary) + '</p>' +
          '</div>' +
          '<button type="button" onclick="openDrawerWithQuery(\'' + escapeHtml(iss.relatedClauses[0] || iss.title) + '\')" class="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shrink-0 transition whitespace-nowrap">' +
            '관련 조항 즉석보기 →' +
          '</button>' +
        '</div>';
      });

      if (matchedAgendas.length > 0) {
        html += '<div class="pt-2"><div class="text-xs font-bold text-slate-500 mb-2">동일 조항·주제로 함께 상정된 개정안 (' + matchedAgendas.length + '건)</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">';
        matchedAgendas.forEach(function(other) {
          const t = getAgendaTallies(other);
          html += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-indigo-300 transition flex flex-col justify-between gap-2">' +
            '<div>' +
              '<div class="flex items-center justify-between gap-1">' +
                '<span class="text-xs font-extrabold text-indigo-700">' + escapeHtml(other.codeName || ("제" + other.orderNo + "호")) + ' (' + escapeHtml(other.targetArticle) + ')</span>' +
                '<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 whitespace-nowrap">' + escapeHtml(other.proposer || other.type) + '</span>' +
              '</div>' +
              '<div class="text-xs font-bold text-slate-900 mt-1">' + escapeHtml(other.title) + '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">' +
              '<span class="text-slate-500">찬성 ' + t.approve + '표 / 기준 ' + t.majorityThreshold + '표</span>' +
              '<button type="button" onclick="selectAgenda(\'' + other.id + '\')" class="font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">이 안건으로 이동 →</button>' +
            '</div>' +
          '</div>';
        });
        html += '</div></div>';
      }

      if (matchedClauses.length > 0) {
        html += '<div class="pt-2"><div class="text-xs font-bold text-slate-500 mb-2">참조된 현행 단칙 조문 (' + matchedClauses.length + '건)</div><div class="space-y-2">';
        matchedClauses.forEach(function(cl) {
          html += '<div class="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
            '<div class="text-xs">' +
              '<span class="font-extrabold text-slate-900">' + escapeHtml(cl.articleNo) + ' (' + escapeHtml(cl.title) + ')</span> ' +
              '<span class="text-slate-600 line-clamp-2">' + escapeHtml(cl.content) + '</span>' +
            '</div>' +
            '<button type="button" onclick="openDrawerWithQuery(\'' + escapeHtml(cl.articleNo) + '\')" class="text-xs font-bold text-indigo-600 hover:underline shrink-0 whitespace-nowrap">조문 전문 보기</button>' +
          '</div>';
        });
        html += '</div></div>';
      }

      container.innerHTML = html;
    }

    // =========================================================================
    // 8. INSTANT SEARCH RENDERING (32 Clauses + Keyword Highlight)
    // =========================================================================

    function renderFullSearchView() {
      const q = appState.fullSearchQuery;

      const filteredClauses = appState.bylaws.filter(function(cl) {
        return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
      });
      document.getElementById("searchCountClauses").textContent = filteredClauses.length + "개 조항";

      let clHtml = "";
      if (filteredClauses.length === 0) {
        clHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">검색어와 일치하는 단칙 조항이 없습니다.</div>';
      } else {
        filteredClauses.forEach(function(cl) {
          const amendedBadge = cl.lastAmended
            ? '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">' + escapeHtml(cl.lastAmended) + '</span>'
            : '';
          clHtml += '<div class="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 space-y-1.5">' +
            '<div class="flex flex-wrap items-center justify-between gap-1">' +
              '<div class="flex items-center gap-1.5">' +
                '<span class="text-xs font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</span>' +
                amendedBadge +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-[11px] font-semibold text-slate-500">' + highlightMatch(cl.chapter, q) + '</span>' +
                '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-indigo-500 text-[11px] font-bold text-indigo-700">✎ 조문 수정</button>' +
              '</div>' +
            '</div>' +
            '<p class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</p>' +
            '<div class="flex flex-wrap gap-1 pt-1">' +
              (cl.keywords || []).map(function(k) {
                return '<button type="button" onclick="setFullSearchQuery(\'' + escapeHtml(k) + '\')" class="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600">#' + highlightMatch(k, q) + '</button>';
              }).join("") +
            '</div>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchClausesList").innerHTML = clHtml;

      const filteredAgendas = appState.agendas.filter(function(ag) {
        return matchesSearch([
          ag.codeName || ("제" + ag.orderNo + "호"),
          ag.proposer || "",
          ag.type,
          ag.targetArticle,
          ag.title,
          ag.beforeText,
          ag.afterText,
          ag.reason,
          (ag.relatedClauses || []).join(" "),
          (ag.keywords || []).join(" ")
        ], q);
      });
      document.getElementById("searchCountAgendas").textContent = filteredAgendas.length + "건";

      let agHtml = "";
      if (filteredAgendas.length === 0) {
        agHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">일치하는 개정안·신규안이 없습니다.</div>';
      } else {
        filteredAgendas.forEach(function(ag) {
          const t = getAgendaTallies(ag);
          agHtml += '<div class="p-4 rounded-xl border border-slate-200 bg-white space-y-2">' +
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
              '<div class="flex items-center gap-1.5">' +
                '<span class="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-bold">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</span>' +
                '<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">' + highlightMatch(ag.targetArticle, q) + '</span>' +
                '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">' + escapeHtml(ag.proposer || ag.type) + '</span>' +
              '</div>' +
              '<button type="button" onclick="jumpToAgendaFromSearch(\'' + ag.id + '\')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline">투표 화면으로 이동 →</button>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + highlightMatch(ag.title, q) + '</div>' +
            '<div class="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-slate-800 whitespace-pre-line">' +
              '<strong class="text-indigo-800">[변경 조문]</strong> ' + highlightMatch(ag.afterText, q) +
            '</div>' +
            '<div class="text-xs text-slate-500 flex items-center justify-between">' +
              '<span>득표: 찬성 ' + t.approve + '(' + t.majorityThreshold + ') / 반대 ' + t.reject + ' / 기권 ' + t.abstain + '</span>' +
              '<span class="font-bold ' + (t.isAdopted ? 'text-emerald-600' : 'text-rose-600') + '">' + (t.isAdopted ? '가결' : '부결') + '</span>' +
            '</div>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchAgendasList").innerHTML = agHtml;

      const filteredIssues = appState.issues.filter(function(iss) {
        return matchesSearch([
          iss.code,
          iss.title,
          iss.summary,
          (iss.relatedClauses || []).join(" "),
          (iss.keywords || []).join(" ")
        ], q);
      });
      document.getElementById("searchCountIssues").textContent = filteredIssues.length + "건";

      let issHtml = "";
      if (filteredIssues.length === 0) {
        issHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">일치하는 현안이 없습니다.</div>';
      } else {
        filteredIssues.forEach(function(iss) {
          issHtml += '<div class="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">' +
            '<div class="flex items-center justify-between">' +
              '<span class="px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-extrabold">' + escapeHtml(iss.code) + '</span>' +
              '<span class="text-xs font-bold text-amber-900">관련 조항: ' + highlightMatch((iss.relatedClauses || []).join(", "), q) + '</span>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + highlightMatch(iss.title, q) + '</div>' +
            '<p class="text-xs text-slate-700 leading-relaxed">' + highlightMatch(iss.summary, q) + '</p>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchIssuesList").innerHTML = issHtml;
    }

    function renderDrawerSearchResults() {
      const q = appState.drawerSearchQuery;
      const container = document.getElementById("drawerSearchResultsContainer");

      const clauses = appState.bylaws.filter(function(cl) {
        return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
      });
      const agendas = appState.agendas.filter(function(ag) {
        return matchesSearch([ag.codeName || "", ag.proposer || "", ag.targetArticle, ag.title, ag.beforeText, ag.afterText, ag.reason, (ag.relatedClauses || []).join(" "), (ag.keywords || []).join(" ")], q);
      });
      const issues = appState.issues.filter(function(iss) {
        return matchesSearch([iss.code, iss.title, iss.summary, (iss.relatedClauses || []).join(" "), (iss.keywords || []).join(" ")], q);
      });

      let html = "";

      html += '<div><div class="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-2">현행 단칙 조항 (' + clauses.length + '건)</div><div class="space-y-2">';
      clauses.forEach(function(cl) {
        html += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">' +
          '<div class="flex items-center justify-between">' +
            '<div class="text-xs font-extrabold text-slate-900">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + ' <span class="text-[11px] font-normal text-slate-500">· ' + escapeHtml(cl.chapter) + '</span></div>' +
            '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="text-[11px] font-bold text-indigo-600 hover:underline">✎ 수정</button>' +
          '</div>' +
          '<p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      html += '<div><div class="text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-2">관련 상정 개정안·신규안 (' + agendas.length + '건)</div><div class="space-y-2">';
      agendas.forEach(function(ag) {
        html += '<div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">' +
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-extrabold text-emerald-900">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + ' · ' + highlightMatch(ag.targetArticle, q) + '</span>' +
            '<button type="button" onclick="selectAgenda(\'' + ag.id + '\'); switchMainTab(\'voting\'); toggleSearchDrawer(false);" class="text-xs font-bold text-indigo-600 underline">이 안건 보기</button>' +
          '</div>' +
          '<div class="text-xs font-bold text-slate-900">' + highlightMatch(ag.title, q) + '</div>' +
          '<p class="text-xs text-slate-700 whitespace-pre-line">' + highlightMatch(ag.afterText, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      html += '<div><div class="text-xs font-extrabold text-amber-700 uppercase tracking-wider mb-2">관련 총회 현안 (' + issues.length + '건)</div><div class="space-y-2">';
      issues.forEach(function(iss) {
        html += '<div class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">' +
          '<div class="text-xs font-extrabold text-amber-900">' + escapeHtml(iss.code) + ' · ' + highlightMatch(iss.title, q) + '</div>' +
          '<p class="text-xs text-slate-700 leading-relaxed">' + highlightMatch(iss.summary, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      container.innerHTML = html;
    }

    // =========================================================================
    // 9. EVENTS VIEW, SETTLEMENT VIEW & ADMIN VIEW RENDERING
    // =========================================================================

    function renderEventsView() {
      // 1. Render General Assembly Official Schedule (정기총회 공식 식순 - 추가/수정/삭제 지원)
      const schedContainer = document.getElementById("assemblyScheduleListContainer");
      if (schedContainer) {
        let sHtml = "";
        (appState.assemblySchedule || []).forEach(function(item) {
          let badgeClass = "bg-slate-100 text-slate-700";
          if (item.status === "완료") badgeClass = "bg-emerald-100 text-emerald-800";
          else if (item.status === "진행중") badgeClass = "bg-amber-100 text-amber-900";
          else if (item.status === "안건상정") badgeClass = "bg-indigo-100 text-indigo-800";

          let actionBtn = "";
          if (item.targetTab === "sectionConcertReview") {
            actionBtn = '<a href="#sectionConcertReview" class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100">요약보기 ↓</a>';
          } else if (item.targetTab) {
            actionBtn = '<button type="button" onclick="switchMainTab(\'' + escapeHtml(item.targetTab) + '\')" class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px]">' + escapeHtml(item.btnLabel || "바로가기 →") + '</button>';
          }

          sHtml += '<li class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition">' +
            '<div class="min-w-0">' +
              '<div class="flex flex-wrap items-center gap-1.5">' +
                '<span class="font-extrabold text-slate-900">' + escapeHtml(item.title) + '</span>' +
                '<span class="px-2 py-0.5 rounded font-bold text-[10px] ' + badgeClass + '">' + escapeHtml(item.status || "진행") + '</span>' +
              '</div>' +
              '<div class="text-xs text-slate-600 mt-0.5">' + escapeHtml(item.desc) + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-1 shrink-0 self-end sm:self-center">' +
              actionBtn +
              '<button type="button" onclick="openScheduleModal(\'' + item.id + '\')" class="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px]" title="식순 수정">✎ 수정</button>' +
              '<button type="button" onclick="deleteScheduleItem(\'' + item.id + '\')" class="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px]" title="식순 삭제">삭제</button>' +
            '</div>' +
          '</li>';
        });
        if (!sHtml) {
          sHtml = '<li class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">등록된 식순이 없습니다. [+ 식순 추가] 버튼으로 추가해 주세요.</li>';
        }
        schedContainer.innerHTML = sHtml;
      }

      // 2. Render Annual Events Timeline (행사 내역 - 추가/수정/삭제 지원)
      const container = document.getElementById("clubEventsTimelineList");
      if (!container) return;
      let html = "";
      appState.events.forEach(function(ev, index) {
        html += '<div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
          '<div class="space-y-1.5 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-extrabold">#' + (index + 1) + '</span>' +
              '<span class="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">' + escapeHtml(ev.category) + '</span>' +
              '<span class="text-xs font-bold text-slate-500">' + escapeHtml(ev.date) + '</span>' +
              '<span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">참여/성원 ' + ev.participantsCount + '명</span>' +
            '</div>' +
            '<h4 class="text-base font-extrabold text-slate-900">' + escapeHtml(ev.title) + '</h4>' +
            '<p class="text-xs sm:text-sm text-slate-700 leading-relaxed">' + escapeHtml(ev.summary) + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
            '<button type="button" onclick="openEditEventModal(\'' + ev.id + '\')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition">✎ 수정</button>' +
            '<button type="button" onclick="deleteEventItem(\'' + ev.id + '\')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition">🗑️ 삭제</button>' +
          '</div>' +
        '</div>';
      });
      if (!html) {
        html = '<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">등록된 행사 내역이 없습니다. [+ 행사 내역 추가] 버튼으로 추가해 주세요.</div>';
      }
      container.innerHTML = html;
    }

    function renderSettlementView() {
      const container = document.getElementById("settlementEventsList");
      if (!container) return;
      let html = "";
      appState.events.forEach(function(ev) {
        html += '<div class="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">' + escapeHtml(ev.title) + '</div>';
      });
      container.innerHTML = html;
    }

    function renderAdminView() {
      const majority = getMajorityThreshold(appState.totalAttendees);
      document.getElementById("adminInputTotalAttendees").value = appState.totalAttendees;
      document.getElementById("adminQuorumPreviewBadge").textContent = "2/3 가결 기준: " + majority + "표 이상 찬성";

      const tbody = document.getElementById("adminAgendasTableBody");
      let html = "";
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const isCurrent = ag.id === appState.activeAgendaId;

        let statusBadge = "";
        if (ag.status === "adopted") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">가결 확정</span>';
        } else if (ag.status === "rejected") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 whitespace-nowrap">부결 확정</span>';
        } else if (ag.status === "active") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 whitespace-nowrap">상정·투표중</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">대기</span>';
        }

        html += '<tr class="' + (isCurrent ? 'bg-indigo-50/40' : '') + '">' +
          '<td class="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</td>' +
          '<td class="py-3 px-3 whitespace-nowrap">' +
            '<span class="font-bold text-indigo-700">' + escapeHtml(ag.targetArticle) + '</span>' +
            '<span class="ml-1 text-xs text-slate-500">(' + escapeHtml(ag.proposer || ag.type) + ')</span>' +
          '</td>' +
          '<td class="py-3 px-3 font-semibold text-slate-900 max-w-xs">' + escapeHtml(ag.title) + '</td>' +
          '<td class="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">' +
            '<span class="text-emerald-700">' + t.approve + '</span> / ' +
            '<span class="text-rose-700">' + t.reject + '</span> / ' +
            '<span class="text-slate-600">' + t.abstain + '</span>' +
          '</td>' +
          '<td class="py-3 px-3 text-center whitespace-nowrap">' +
            (t.isAdopted
              ? '<span class="text-xs font-extrabold text-emerald-600">가결 (' + t.approve + '/' + t.majorityThreshold + ')</span>'
              : '<span class="text-xs font-semibold text-rose-600">부결 (' + t.approve + '/' + t.majorityThreshold + ')</span>') +
          '</td>' +
          '<td class="py-3 px-3 text-center">' + statusBadge + '</td>' +
          '<td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">' +
            '<button type="button" onclick="adminPresentAgenda(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">상정</button>' +
            '<button type="button" onclick="adminSimulateVote(\'' + ag.id + '\', \'approve\')" class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">+찬성</button>' +
            '<button type="button" onclick="adminSimulateVote(\'' + ag.id + '\', \'reject\')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">+반대</button>' +
            '<button type="button" onclick="adminSimulateVote(\'' + ag.id + '\', \'abstain\')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">+기권</button>' +
            '<button type="button" onclick="adminFinalizeSpecificAgenda(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">마감확정</button>' +
          '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    // =========================================================================
    // 10. AUTH MODAL: 134 MEMBERS + EXECUTIVE PASSWORD ("2003") GATE
    // =========================================================================

    function handleAuthModalSearch(val) {
      appState.authModalSearch = val;
      renderAuthModalMemberList();
    }

    function setAuthModalFilter(filterKey) {
      appState.authModalFilter = filterKey;
      renderAuthModalMemberList();
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
        } else if (k === "exec") {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300";
        } else {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50";
        }
      });

      const filtered = appState.members.filter(function(m) {
        if (fKey === "exec" && !m.isExecutive) return false;
        if (fKey !== "all" && fKey !== "exec" && m.basePart !== fKey) return false;
        if (q) {
          const hay = (m.name + " " + m.part + " " + (m.basePart || "") + " " + (m.execRole || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      let html = "";
      filtered.forEach(function(m) {
        const isSelected = m.id === appState.currentVoterId;
        const votedChoice = votesMap[m.id];
        const choiceLabel = votedChoice === "approve" ? "찬성 완료" : votedChoice === "reject" ? "반대 완료" : votedChoice === "abstain" ? "기권 완료" : m.isExecutive ? "🔒 운영진 인증" : "일반로그인";

        html += '<button type="button" onclick="selectVoter(\'' + m.id + '\')" class="p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1 ' +
          (isSelected ? 'border-2 border-indigo-600 bg-indigo-50/70' : m.isExecutive ? 'border-amber-300 bg-amber-50/30 hover:bg-amber-50' : 'border-slate-200 hover:bg-slate-50') + '">' +
          '<div class="min-w-0">' +
            '<div class="text-xs font-extrabold text-slate-900 truncate">' +
              (m.isExecutive ? '<span class="text-amber-600 mr-0.5">★</span>' : '') +
              escapeHtml(m.name) + ' <span class="text-indigo-600 font-semibold">(' + escapeHtml(m.part) + ')</span>' +
            '</div>' +
            '<div class="text-[11px] text-slate-500">' + (m.isExecutive ? '2026 메리고잉 운영진 (패스워드 인증)' : 'KEY: ' + escapeHtml(m.key || m.name)) + '</div>' +
          '</div>' +
          '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ' +
            (votedChoice ? 'bg-emerald-100 text-emerald-800' : m.isExecutive ? 'bg-amber-200 text-amber-950' : 'bg-slate-100 text-slate-700') + '">' + choiceLabel + '</span>' +
        '</button>';
      });
      container.innerHTML = html;
    }

    function promptExecutiveLoginFromOutside(memberId) {
      openAuthModal();
      selectVoter(memberId);
    }

    function selectVoter(memberId) {
      const m = appState.members.find(function(x) { return x.id === memberId; });
      if (!m) return;

      // 운영진일 경우 반드시 패스워드(2003) 입력을 거쳐야만 로그인 가능!
      if (m.isExecutive) {
        pendingExecMemberId = m.id;
        const box = document.getElementById("execPasswordAuthBox");
        const label = document.getElementById("execAuthTargetLabel");
        const inp = document.getElementById("inputExecPassword");
        const err = document.getElementById("execPasswordErrorMsg");
        if (label) label.textContent = "★ " + m.name + " (" + m.part + ") 운영진 로그인 — 패스워드 인증";
        if (err) err.classList.add("hidden");
        if (box) box.classList.remove("hidden");
        if (inp) {
          inp.value = "";
          setTimeout(function() { inp.focus(); }, 50);
        }
        return;
      }

      // 일반 단원은 패스워드 없이 즉시 로그인되며 운영진 제어 탭은 숨김 처리
      pendingExecMemberId = null;
      appState.currentVoterId = m.id;
      appState.isAdminAuthenticated = false;
      const box = document.getElementById("execPasswordAuthBox");
      if (box) box.classList.add("hidden");
      closeAuthModal();
      saveStateToStorage();
      renderAll();
      showToast(m.name + " (" + m.part + ") 단원으로 로그인되었습니다. (일반 단원 모드 · 운영진 제어 탭 숨김)");
    }

    function cancelExecPasswordPrompt() {
      pendingExecMemberId = null;
      const box = document.getElementById("execPasswordAuthBox");
      if (box) box.classList.add("hidden");
    }

    function confirmExecPasswordLogin() {
      const inp = document.getElementById("inputExecPassword");
      const err = document.getElementById("execPasswordErrorMsg");
      const entered = (inp ? inp.value : "").trim();

      if (entered !== ADMIN_PASSWORD_CODE) {
        if (err) err.classList.remove("hidden");
        showToast("패스워드가 일치하지 않습니다. 운영진 전용 패스워드를 정확히 입력해 주세요.");
        return;
      }

      const m = appState.members.find(function(x) { return x.id === pendingExecMemberId; }) || appState.members[0];
      appState.currentVoterId = m.id;
      appState.isAdminAuthenticated = true;
      pendingExecMemberId = null;
      const box = document.getElementById("execPasswordAuthBox");
      if (box) box.classList.add("hidden");
      closeAuthModal();
      saveStateToStorage();
      renderAll();
      showToast("운영진 인증 완료! [" + m.name + " (" + m.part + ")] 운영진으로 로그인되어 운영진 전용 탭이 활성화되었습니다.");
    }

    // =========================================================================
    // 11. TAB & AGENDA NAVIGATION CONTROLLERS
    // =========================================================================

    function switchMainTab(tabName) {
      if (tabName === "search") tabName = "bylaws";
      const voter = getCurrentVoter();
      const isExec = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      if (tabName === "admin" && !isExec) {
        showToast("운영진 전용 탭입니다. 상단 단원 변경에서 운영진으로 로그인해 주세요.");
        openAuthModal();
        setAuthModalFilter("exec");
        return;
      }
      if (tabName === "winner" && !isExec && !appState.winnerPagePublic) {
        showToast("단장 당선 공고는 현재 운영진 전용(비공개) 상태입니다.");
        return;
      }
      appState.activeTab = tabName;
      ["events", "settlement", "voting", "election", "bylaws", "search", "winner", "admin"].forEach(function(t) {
        const sec = document.getElementById("view-" + t);
        const btn = document.getElementById("tabBtn-" + t);
        if (!sec || !btn) return;
        if (t === "search") {
          sec.classList.add("hidden");
          btn.className = "hidden";
          return;
        }
        const isHiddenTab = (t === "admin" && !isExec) || (t === "winner" && !isExec && !appState.winnerPagePublic);
        if (t === tabName && !isHiddenTab) {
          sec.classList.remove("hidden");
          btn.className = "nav-tab-btn whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 bg-white text-slate-900 shadow-sm shrink-0";
        } else {
          sec.classList.add("hidden");
          btn.className = (isHiddenTab ? "hidden " : "") + "nav-tab-btn whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/70 shrink-0";
        }
      });
      renderAll();
    }

    function selectAgenda(agendaId) {
      appState.activeAgendaId = agendaId;
      saveStateToStorage();
      renderAll();
    }

    function stepAgenda(delta) {
      const idx = appState.agendas.findIndex(function(a) { return a.id === appState.activeAgendaId; });
      if (idx === -1) return;
      const nextIdx = (idx + delta + appState.agendas.length) % appState.agendas.length;
      const nextAg = appState.agendas[nextIdx];
      appState.activeAgendaId = nextAg.id;
      saveStateToStorage();
      renderAll();
      showToast((nextAg.codeName || ("제" + nextAg.orderNo + "호")) + " (" + nextAg.targetArticle + ") 안건으로 이동했습니다.");
    }

    function castVote(choice) {
      const ag = getActiveAgenda();
      const voter = getCurrentVoter();
      if (!ag.memberVotes) ag.memberVotes = {};

      if (ag.memberVotes[voter.id]) {
        showToast("이미 이 안건에 투표하셨습니다. (1인 1표 중복 투표 제한)");
        return;
      }

      ag.memberVotes[voter.id] = choice;
      const tallies = getAgendaTallies(ag);
      const korChoice = choice === "approve" ? "찬성" : choice === "reject" ? "반대" : "기권";
      saveStateToStorage();
      renderAll();

      if (tallies.isAdopted) {
        showToast(voter.name + " 단원 [" + korChoice + "] 투표 완료! 2/3 가결 기준(" + tallies.majorityThreshold + "표)을 충족했습니다.");
      } else {
        showToast(voter.name + " 단원 [" + korChoice + "] 투표가 집계되었습니다.");
      }
    }

    function switchNextUnvotedMember() {
      const ag = getActiveAgenda();
      const votesMap = ag.memberVotes || {};
      const nextMember = appState.members.find(function(m) { return !m.isExecutive && !votesMap[m.id]; });
      if (nextMember) {
        appState.currentVoterId = nextMember.id;
        appState.isAdminAuthenticated = false;
        renderAll();
        showToast("미투표 일반 단원 [" + nextMember.name + " (" + nextMember.part + ")] 계정으로 전환되었습니다.");
      } else {
        openAuthModal();
      }
    }

    function finalizeActiveAgenda() {
      const ag = getActiveAgenda();
      const tallies = getAgendaTallies(ag);
      ag.status = tallies.isAdopted ? "adopted" : "rejected";
      saveStateToStorage();
      renderAll();
      showToast(
        (ag.codeName || ("제" + ag.orderNo + "호")) + " 투표 마감: 찬성 " + tallies.approve + "표 (2/3 기준 " + tallies.majorityThreshold + "표) → 최종 [" +
        (tallies.isAdopted ? "가결" : "부결") + "] 확정!"
      );
    }

    function reopenActiveAgenda() {
      const ag = getActiveAgenda();
      ag.status = "active";
      saveStateToStorage();
      renderAll();
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 투표가 재개시되었습니다.");
    }

    function handleFullSearchInput(val) {
      appState.fullSearchQuery = val;
      renderFullSearchView();
    }

    function setFullSearchQuery(val) {
      appState.fullSearchQuery = val;
      const input = document.getElementById("fullSearchInput");
      if (input) input.value = val;
      renderFullSearchView();
    }

    function handleDrawerSearchInput(val) {
      appState.drawerSearchQuery = val;
      renderDrawerSearchResults();
    }

    function setDrawerSearchQuery(val) {
      appState.drawerSearchQuery = val;
      const input = document.getElementById("drawerSearchInput");
      if (input) input.value = val;
      renderDrawerSearchResults();
    }

    function toggleSearchDrawer(open) {
      const backdrop = document.getElementById("searchDrawerBackdrop");
      const panel = document.getElementById("searchDrawerPanel");
      if (open) {
        backdrop.classList.remove("hidden");
        panel.classList.remove("translate-x-full");
        renderDrawerSearchResults();
      } else {
        backdrop.classList.add("hidden");
        panel.classList.add("translate-x-full");
      }
    }

    function openDrawerWithQuery(query) {
      setDrawerSearchQuery(query);
      toggleSearchDrawer(true);
    }

    function openClauseInDrawerFromActive() {
      const ag = getActiveAgenda();
      const baseClause = (ag.relatedClauses && ag.relatedClauses[0]) || ag.targetArticle.split(" ")[0];
      openDrawerWithQuery(baseClause);
    }

    function openRelatedInFullSearch() {
      const ag = getActiveAgenda();
      const baseClause = (ag.relatedClauses && ag.relatedClauses[0]) || ag.targetArticle.split(" ")[0];
      handleBylawIntegratedSearch(baseClause);
      switchMainTab("bylaws");
    }

    function jumpToAgendaFromSearch(agendaId) {
      appState.activeAgendaId = agendaId;
      switchMainTab("voting");
      showToast("선택한 안건 투표 화면으로 이동했습니다.");
    }

    // =========================================================================
    // 12. BYLAW & AGENDA LIVE EDITING + MERGING ADOPTED AGENDAS INTO BYLAWS
    // =========================================================================

    function openEditClauseModal(clauseId) {
      const cl = appState.bylaws.find(function(c) { return c.id === clauseId; });
      if (!cl) return;
      document.getElementById("editTargetMode").value = "clause";
      document.getElementById("editTargetId").value = cl.id;
      document.getElementById("editModalHeaderTitle").textContent = cl.articleNo + " 단칙 원문 직접 수정";
      document.getElementById("editLabelTitle").textContent = cl.articleNo + " 조항 제목";
      document.getElementById("editLabelContent").textContent = cl.articleNo + " 조문 본문 내용";
      document.getElementById("editInputTitle").value = cl.title;
      document.getElementById("editInputContent").value = cl.content;
      document.getElementById("editExtraBeforeWrap").classList.add("hidden");

      const m = document.getElementById("editClauseModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function openEditActiveAgendaModal() {
      const ag = getActiveAgenda();
      if (!ag) return;
      document.getElementById("editTargetMode").value = "agenda";
      document.getElementById("editTargetId").value = ag.id;
      document.getElementById("editModalHeaderTitle").textContent = (ag.codeName || ("제" + ag.orderNo + "호")) + " (" + ag.targetArticle + ") 문구 수정";
      document.getElementById("editLabelTitle").textContent = "안건 제목";
      document.getElementById("editLabelContent").textContent = "개정안 / 신설 조문 문구 (우측 대비표)";
      document.getElementById("editInputTitle").value = ag.title;
      document.getElementById("editInputContent").value = ag.afterText;
      document.getElementById("editInputBefore").value = ag.beforeText;
      document.getElementById("editExtraBeforeWrap").classList.remove("hidden");

      const m = document.getElementById("editClauseModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeEditClauseModal() {
      const m = document.getElementById("editClauseModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveEditedClauseOrAgenda() {
      const mode = document.getElementById("editTargetMode").value;
      const targetId = document.getElementById("editTargetId").value;
      const newTitle = (document.getElementById("editInputTitle").value || "").trim();
      const newContent = (document.getElementById("editInputContent").value || "").trim();

      if (!newTitle || !newContent) {
        showToast("제목과 본문 내용을 모두 입력해 주세요.");
        return;
      }

      if (mode === "clause") {
        const cl = appState.bylaws.find(function(c) { return c.id === targetId; });
        if (cl) {
          cl.title = newTitle;
          cl.content = newContent;
          cl.lastAmended = "현장수정 반영";
        }
        showToast((cl ? cl.articleNo : "단칙") + " 조문이 수정 저장되었습니다.");
      } else {
        const ag = appState.agendas.find(function(a) { return a.id === targetId; });
        const newBefore = (document.getElementById("editInputBefore").value || "").trim();
        if (ag) {
          ag.title = newTitle;
          ag.afterText = newContent;
          if (newBefore) ag.beforeText = newBefore;
        }
        showToast("상정 안건 문구가 수정 저장되었습니다.");
      }

      closeEditClauseModal();
      saveStateToStorage();
      renderAll();
    }

    function applyAdoptedAgendasToBylaws() {
      let appliedCount = 0;
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const isAdopted = ag.status === "adopted" || t.isAdopted;
        if (!isAdopted) return;

        const baseArt = normalizeArticleQuery(ag.targetArticle.split("(")[0].split(" ")[0]);
        const targetClause = appState.bylaws.find(function(c) { return c.articleNo === baseArt; });
        if (!targetClause) return;

        const cleanedAfter = ag.afterText.replace(/^제\s*\d+\s*조[^:：]*[:：]\s*/, "").trim();
        const tagMarker = "[" + (ag.codeName || ("제" + ag.orderNo + "호")) + " 가결 반영]";

        if (targetClause.content.indexOf(tagMarker) === -1 && targetClause.content.indexOf(cleanedAfter.slice(0, 20)) === -1) {
          targetClause.content = targetClause.content + "\n\n• " + tagMarker + "\n" + cleanedAfter;
          targetClause.lastAmended = "19차 정기총회 가결";
          appliedCount += 1;
        } else {
          targetClause.lastAmended = "19차 정기총회 가결";
        }
      });

      saveStateToStorage();
      renderAll();
      if (appliedCount > 0) {
        showToast("가결된 개정안 " + appliedCount + "건이 현재 단칙 원문(제1조~제32조)에 추가 반영되었습니다!");
      } else {
        showToast("가결된 5건(개정안 2-2, 4, 7-2, 8, 9)이 이미 《삼성한우리합창단 단칙(25.12.13)》 원문에 모두 반영되어 있습니다.");
      }
    }

    // =========================================================================
    // 13. EXPORT DELIVERABLES
    // =========================================================================

    function triggerDownloadBlob(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function exportFinalBylawsMarkdown() {
      const lines = [
        "# 삼성한우리합창단 단칙 (정기총회 개정 반영본)",
        "",
        "- **2005년 6월 1일 제정 / 2025년 12월 13일 19차 개정**",
        "- **주관**: 2026 메리고잉 삼성한우리합창단 운영진 (단장 이창욱 · 부단장 한석범)",
        ""
      ];

      let currentChapter = "";
      appState.bylaws.forEach(function(cl) {
        if (cl.chapter !== currentChapter) {
          currentChapter = cl.chapter;
          lines.push("## " + currentChapter);
          lines.push("");
        }
        const badge = cl.lastAmended ? " [" + cl.lastAmended + "]" : "";
        lines.push("### " + cl.articleNo + " (" + cl.title + ")" + badge);
        lines.push(cl.content);
        lines.push("");
      });

      triggerDownloadBlob(lines.join("\n"), "삼성한우리합창단_단칙_전문.md", "text/markdown;charset=utf-8;");
      showToast("최종 개정 단칙 전문(.md) 파일 다운로드가 시작되었습니다.");
    }

    function exportFinalBylawsHTML() {
      let clausesHtml = "";
      let currentChapter = "";
      appState.bylaws.forEach(function(cl) {
        if (cl.chapter !== currentChapter) {
          currentChapter = cl.chapter;
          clausesHtml += '<h2 style="margin-top:24px;font-size:16px;color:#1e1b4b;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">' + escapeHtml(currentChapter) + '</h2>';
        }
        clausesHtml += '<div style="margin:12px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">' +
          '<div style="font-weight:800;font-size:14px;color:#0f172a;">' + escapeHtml(cl.articleNo) + ' (' + escapeHtml(cl.title) + ') ' +
          (cl.lastAmended ? '<span style="font-size:11px;color:#047857;background:#d1fae5;padding:2px 6px;border-radius:4px;">' + escapeHtml(cl.lastAmended) + '</span>' : '') +
          '</div>' +
          '<div style="margin-top:6px;font-size:13px;line-height:1.7;white-space:pre-line;color:#334155;">' + escapeHtml(cl.content) + '</div>' +
        '</div>';
      });

      const docHtml = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>삼성한우리합창단 단칙 전문</title></head>' +
        '<body style="font-family:\'Malgun Gothic\',sans-serif;max-width:840px;margin:32px auto;padding:0 20px;color:#0f172a;">' +
        '<div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:16px;">' +
          '<div style="font-size:12px;color:#475569;font-weight:700;">2005년 6월 1일 제정 · 2025년 12월 13일 19차 개정</div>' +
          '<h1 style="font-size:24px;margin:8px 0;">삼성한우리합창단 단칙</h1>' +
          '<div style="font-size:12px;color:#64748b;">주관: 2026 메리고잉 삼성한우리합창단 운영진 (단장 이창욱)</div>' +
        '</div>' +
        clausesHtml +
        '</body></html>';

      triggerDownloadBlob(docHtml, "삼성한우리합창단_단칙_인쇄용.html", "text/html;charset=utf-8;");
      showToast("인쇄·보관용 최종 단칙 문서(.html) 다운로드가 시작되었습니다.");
    }

    function exportOfficialMinutesHTML() {
      let rowsHtml = "";
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const verdict = (ag.status === "adopted" || t.isAdopted) ? "가결" : "부결";
        const verdictColor = (ag.status === "adopted" || t.isAdopted) ? "#047857" : "#be123c";
        rowsHtml += '<tr>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-weight:700;text-align:center;">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '<br><span style="font-size:11px;color:#475569;">(' + escapeHtml(ag.proposer || ag.type) + ')</span></td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-weight:700;">' + escapeHtml(ag.targetArticle) + '<br><span style="font-weight:600;font-size:12px;">' + escapeHtml(ag.title) + '</span></td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-size:12px;color:#475569;white-space:pre-line;">' + escapeHtml(ag.beforeText) + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-size:12px;font-weight:600;background:#f8fafc;white-space:pre-line;">' + escapeHtml(ag.afterText) + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;text-align:center;font-size:12px;">찬성 <strong>' + t.approve + '(' + t.majorityThreshold + ')</strong><br>반대 ' + t.reject + '<br>기권 ' + t.abstain + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;text-align:center;font-weight:800;color:' + verdictColor + ';">' + verdict + '</td>' +
        '</tr>';
      });

      const reportHtml = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>삼성한우리합창단 총회 단칙 개정 찬반투표 결과보고서</title></head>' +
        '<body style="font-family:\'Malgun Gothic\',sans-serif;max-width:980px;margin:32px auto;padding:0 20px;color:#0f172a;">' +
        '<h1 style="text-align:center;font-size:22px;margin-bottom:6px;">2026 삼성한우리합창단 정기총회 with ‘메리고잉 운영진’</h1>' +
        '<h2 style="text-align:center;font-size:16px;color:#475569;margin-top:0;">단칙 개정안 찬반투표 공식 의결 결과 산출물</h2>' +
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">' +
          '<thead><tr style="background:#e2e8f0;">' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">안건</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">대상 조항 및 안건명</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">기존</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">변경</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">득표 결과</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">의결 판정</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        '</body></html>';

      triggerDownloadBlob(reportHtml, "삼성한우리합창단_찬반투표_공식결과보고서.html", "text/html;charset=utf-8;");
      showToast("찬반투표 공식 의결 결과보고서(.html) 다운로드가 시작되었습니다.");
    }

    function exportFullStateJSON() {
      const jsonStr = JSON.stringify(appState, null, 2);
      triggerDownloadBlob(jsonStr, "2026_삼성한우리합창단_총회데이터_백업.json", "application/json;charset=utf-8;");
      showToast("전체 단칙·안건·투표 데이터(.json) 백업 파일이 저장되었습니다.");
    }

    function triggerImportJSON() {
      const inp = document.getElementById("hiddenJsonFileInput");
      if (inp) inp.click();
    }

    function handleImportJSONFile(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed && Array.isArray(parsed.agendas) && Array.isArray(parsed.bylaws)) {
            appState = Object.assign(getDefaultState(), parsed);
            saveStateToStorage();
            renderAll();
            showToast("백업 파일(.json)로부터 단칙 및 투표 데이터를 성공적으로 복원했습니다!");
          } else {
            showToast("올바른 총회 백업 JSON 파일 형식이 아닙니다.");
          }
        } catch (err) {
          showToast("JSON 파일 읽기에 실패했습니다.");
        }
      };
      reader.readAsText(file);
    }

    // =========================================================================
    // 14. REALTIME CLOUD DB SYNC & MODALS
    // =========================================================================

    function openCloudSyncModal() {
      const m = document.getElementById("cloudSyncModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeCloudSyncModal() {
      const m = document.getElementById("cloudSyncModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function normalizeFirebaseEndpoint(rawUrl) {
      if (!rawUrl) return "";
      let u = rawUrl.trim().replace(/\/+$/, "");
      if (u.indexOf("https://") !== 0) return "";
      if (!u.endsWith(".json")) {
        u = u + "/hanuri_assembly_2026.json";
      }
      return u;
    }

    function connectRealtimeDb() {
      const inp = document.getElementById("inputFirebaseDbUrl");
      const endpoint = normalizeFirebaseEndpoint(inp ? inp.value : "");
      if (!endpoint) {
        showToast("https:// 로 시작하는 유효한 Firebase Realtime DB 주소를 입력해 주세요.");
        return;
      }
      cloudSyncUrl = endpoint;
      try {
        localStorage.setItem(STORAGE_KEY + "_db_url", inp.value.trim());
      } catch (e) {}
      pushStateToCloudIfConnected();
      startCloudSyncPolling();
      updateCloudSyncUiBadge(true);
      showToast("실시간 클라우드 DB 동기화가 연결되었습니다!");
    }

    function disconnectRealtimeDb() {
      cloudSyncUrl = "";
      if (cloudSyncTimer) clearInterval(cloudSyncTimer);
      cloudSyncTimer = null;
      try {
        localStorage.removeItem(STORAGE_KEY + "_db_url");
      } catch (e) {}
      updateCloudSyncUiBadge(false);
      showToast("실시간 DB 연결이 해제되고 로컬 저장 모드로 전환되었습니다.");
    }

    function updateCloudSyncUiBadge(connected) {
      const label = document.getElementById("cloudSyncStatusLabel");
      const badge = document.getElementById("modalSyncBadge");
      if (connected) {
        if (label) label.textContent = "실시간 클라우드 DB 동기화 연결됨 (LIVE)";
        if (badge) {
          badge.textContent = "실시간 DB 연결중";
          badge.className = "px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold";
        }
      } else {
        if (label) label.textContent = "2026 정기총회 실시간 의결 시스템 (자동저장 ON)";
        if (badge) {
          badge.textContent = "로컬 저장 모드";
          badge.className = "px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-bold";
        }
      }
    }

    function pushStateToCloudIfConnected() {
      if (!cloudSyncUrl) return;
      const endpoint = cloudSyncUrl;
      fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAttendees: appState.totalAttendees,
          activeAgendaId: appState.activeAgendaId,
          uploadedFileName: appState.uploadedFileName,
          members: appState.members,
          bylaws: appState.bylaws,
          agendas: appState.agendas,
          election: appState.election,
          events: appState.events,
          updatedAt: Date.now()
        })
      }).catch(function() {});
    }

    function startCloudSyncPolling() {
      if (cloudSyncTimer) clearInterval(cloudSyncTimer);
      if (!cloudSyncUrl) return;
      updateCloudSyncUiBadge(true);
      cloudSyncTimer = setInterval(function() {
        if (!cloudSyncUrl) return;
        const endpoint = cloudSyncUrl;
        fetch(endpoint)
          .then(function(res) { return res.json(); })
          .then(function(remote) {
            if (remote && Array.isArray(remote.agendas) && Array.isArray(remote.bylaws)) {
              appState.totalAttendees = remote.totalAttendees || appState.totalAttendees;
              appState.activeAgendaId = remote.activeAgendaId || appState.activeAgendaId;
              appState.uploadedFileName = remote.uploadedFileName || appState.uploadedFileName;
              appState.members = remote.members || appState.members;
              appState.bylaws = remote.bylaws;
              appState.agendas = remote.agendas;
              if (remote.election) appState.election = remote.election;
              appState.events = remote.events || appState.events;
              renderAll();
            }
          })
          .catch(function() {});
      }, 2500);
    }

    function openAuthModal() {
      renderAuthModalMemberList();
      const m = document.getElementById("authModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeAuthModal() {
      const m = document.getElementById("authModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function registerAndSwitchVoter() {
      const nameInput = document.getElementById("inputNewVoterName");
      const partInput = document.getElementById("inputNewVoterPart");
      const codeInput = document.getElementById("inputNewVoterCode");

      const name = (nameInput.value || "").trim();
      const part = partInput.value || "소프라노";
      const code = (codeInput.value || "").trim() || String(Math.floor(1000 + Math.random() * 9000));

      if (!name) {
        showToast("단원 이름을 입력해 주세요.");
        return;
      }

      let existing = appState.members.find(function(m) {
        return m.name === name && m.basePart === part;
      });
      if (!existing) {
        existing = {
          id: "mem-" + (appState.members.length + 1),
          rowNo: appState.members.length + 2,
          name: name,
          basePart: part,
          part: part,
          key: name + "-" + part,
          isExecutive: false,
          execRole: "정단원",
          code: code,
          att0307: "정기연습(출석 1)",
          att0314: "정기연습(출석 1)",
          att0321: "정기연습(출석 1)",
          att0328: "정기연습(출석 1)"
        };
        appState.members.push(existing);
      }

      if (existing.isExecutive) {
        selectVoter(existing.id);
        return;
      }

      appState.currentVoterId = existing.id;
      appState.isAdminAuthenticated = false;
      nameInput.value = "";
      codeInput.value = "";
      closeAuthModal();
      saveStateToStorage();
      renderAll();
      showToast(existing.name + " (" + existing.part + ") 단원으로 로그인되었습니다.");
    }

    function adjustTotalAttendees(delta) {
      const nextVal = Math.max(1, appState.totalAttendees + delta);
      appState.totalAttendees = nextVal;
      saveStateToStorage();
      renderAll();
      showToast("총회 투표 재석 인원이 " + nextVal + "명(2/3 가결 기준 " + getMajorityThreshold(nextVal) + "표)으로 변경되었습니다.");
    }

    function setTotalAttendeesDirect(val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        appState.totalAttendees = parsed;
        saveStateToStorage();
        renderAll();
        showToast("총회 투표 재석 인원이 " + parsed + "명으로 설정되었습니다.");
      }
    }

    function adminPresentAgenda(agendaId) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      ag.status = "active";
      appState.activeAgendaId = agendaId;
      saveStateToStorage();
      switchMainTab("voting");
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 안건을 메인 투표 화면에 상정했습니다.");
    }

    function adminSimulateVote(agendaId, choice) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      if (choice === "approve") ag.baseApprove += 1;
      else if (choice === "reject") ag.baseReject += 1;
      else if (choice === "abstain") ag.baseAbstain += 1;
      saveStateToStorage();
      renderAll();
    }

    function adminFinalizeSpecificAgenda(agendaId) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      const t = getAgendaTallies(ag);
      ag.status = t.isAdopted ? "adopted" : "rejected";
      saveStateToStorage();
      renderAll();
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 안건이 [" + (t.isAdopted ? "가결" : "부결") + "]로 확정되었습니다.");
    }

    function openAddAgendaModal() {
      const m = document.getElementById("addAgendaModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeAddAgendaModal() {
      const m = document.getElementById("addAgendaModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function submitNewAgenda() {
      const type = document.getElementById("newAgendaType").value;
      const article = (document.getElementById("newAgendaArticle").value || "").trim() || "제23조 제3항";
      const title = (document.getElementById("newAgendaTitle").value || "").trim();
      const beforeText = (document.getElementById("newAgendaBefore").value || "").trim() || "현행 단칙 내 관련 조문 없음 (신설)";
      const afterText = (document.getElementById("newAgendaAfter").value || "").trim();
      const reason = (document.getElementById("newAgendaReason").value || "").trim() || "메리고잉 운영진 및 단원 건의로 상정됨";
      const kwRaw = (document.getElementById("newAgendaKeywords").value || "").trim();

      if (!title || !afterText) {
        showToast("안건 제목과 상정 조문 문구를 입력해 주세요.");
        return;
      }

      const normClause = normalizeArticleQuery(article.split(" ")[0]);
      const keywords = kwRaw
        ? kwRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean)
        : [normClause, type];

      const newOrder = appState.agendas.length + 1;
      const voter = getCurrentVoter();
      const newAg = {
        id: "ag-" + newOrder,
        orderNo: newOrder,
        codeName: "단칙 개정안 " + newOrder,
        proposer: voter.name + " 단원",
        type: type,
        targetArticle: article,
        relatedClauses: [normClause],
        title: title,
        beforeText: beforeText,
        afterText: afterText,
        reason: reason,
        keywords: keywords,
        status: "active",
        voterTotal: appState.totalAttendees,
        passThreshold: getMajorityThreshold(appState.totalAttendees),
        baseApprove: 0,
        baseReject: 0,
        baseAbstain: 0,
        memberVotes: {}
      };

      appState.agendas.push(newAg);
      appState.activeAgendaId = newAg.id;
      closeAddAgendaModal();
      saveStateToStorage();
      renderAll();
      showToast("신규 단칙 개정안이 등록되었습니다.");
    }

    function openAddEventModal() {
      document.getElementById("editEventId").value = "";
      document.getElementById("newEventDate").value = "";
      document.getElementById("newEventCategory").value = "";
      document.getElementById("newEventTitle").value = "";
      document.getElementById("newEventCount").value = "";
      document.getElementById("newEventBudget").value = "";
      document.getElementById("newEventSummary").value = "";
      const titleEl = document.getElementById("eventModalTitleText");
      if (titleEl) titleEl.textContent = "연간 일정 및 행사 내역 추가";
      const m = document.getElementById("addEventModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function openEditEventModal(eventId) {
      const ev = appState.events.find(function(x) { return x.id === eventId; });
      if (!ev) return;
      document.getElementById("editEventId").value = ev.id;
      document.getElementById("newEventDate").value = ev.date || "";
      document.getElementById("newEventCategory").value = ev.category || "";
      document.getElementById("newEventTitle").value = ev.title || "";
      document.getElementById("newEventCount").value = ev.participantsCount || 35;
      document.getElementById("newEventBudget").value = ev.budgetNote || "";
      document.getElementById("newEventSummary").value = ev.summary || "";
      const titleEl = document.getElementById("eventModalTitleText");
      if (titleEl) titleEl.textContent = "행사 내역 수정";
      const m = document.getElementById("addEventModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function deleteEventItem(eventId) {
      appState.events = appState.events.filter(function(x) { return x.id !== eventId; });
      saveStateToStorage();
      renderAll();
      showToast("선택한 행사 내역이 삭제되었습니다.");
    }

    function closeAddEventModal() {
      const m = document.getElementById("addEventModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function submitNewEvent() {
      const editId = document.getElementById("editEventId").value;
      const date = (document.getElementById("newEventDate").value || "").trim() || "2026. 12. 05";
      const category = (document.getElementById("newEventCategory").value || "").trim() || "특별행사";
      const title = (document.getElementById("newEventTitle").value || "").trim();
      const count = parseInt(document.getElementById("newEventCount").value, 10) || 35;
      const budget = (document.getElementById("newEventBudget").value || "").trim() || "결산 내역 확인중";
      const summary = (document.getElementById("newEventSummary").value || "").trim() || "메리고잉 운영진 주관 행사";

      if (!title) {
        showToast("행사명을 입력해 주세요.");
        return;
      }

      if (editId) {
        const ev = appState.events.find(function(x) { return x.id === editId; });
        if (ev) {
          ev.date = date;
          ev.category = category;
          ev.title = title;
          ev.participantsCount = count;
          ev.budgetNote = budget;
          ev.summary = summary;
        }
        showToast("행사 내역이 수정되었습니다.");
      } else {
        appState.events.push({
          id: "ev-" + Date.now(),
          date: date,
          category: category,
          title: title,
          participantsCount: count,
          budgetNote: budget,
          summary: summary
        });
        showToast("새 행사 내역이 추가되었습니다.");
      }

      closeAddEventModal();
      saveStateToStorage();
      renderAll();
    }

    function openScheduleModal(schedId) {
      const item = schedId ? (appState.assemblySchedule || []).find(function(x) { return x.id === schedId; }) : null;
      document.getElementById("editScheduleId").value = item ? item.id : "";
      document.getElementById("schedInputTitle").value = item ? item.title : "";
      document.getElementById("schedInputDesc").value = item ? item.desc : "";
      document.getElementById("schedInputStatus").value = item ? (item.status || "진행중") : "진행중";
      document.getElementById("schedInputTargetTab").value = item ? (item.targetTab || "") : "";
      const m = document.getElementById("scheduleModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeScheduleModal() {
      const m = document.getElementById("scheduleModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveScheduleItem() {
      const editId = document.getElementById("editScheduleId").value;
      const title = (document.getElementById("schedInputTitle").value || "").trim();
      const desc = (document.getElementById("schedInputDesc").value || "").trim();
      const status = document.getElementById("schedInputStatus").value || "진행중";
      const targetTab = document.getElementById("schedInputTargetTab").value || "";

      if (!title) {
        showToast("식순 제목을 입력해 주세요.");
        return;
      }

      const labelMap = {
        "": "",
        "sectionConcertReview": "요약보기 ↓",
        "settlement": "결산탭 →",
        "voting": "투표탭 →",
        "election": "단장선거 →",
        "bylaws": "단칙보기 →",
        "winner": "당선공고 →"
      };

      if (!Array.isArray(appState.assemblySchedule)) appState.assemblySchedule = [];

      if (editId) {
        const item = appState.assemblySchedule.find(function(x) { return x.id === editId; });
        if (item) {
          item.title = title;
          item.desc = desc;
          item.status = status;
          item.targetTab = targetTab;
          item.btnLabel = labelMap[targetTab] || "바로가기 →";
        }
        showToast("정기총회 식순 항목이 수정되었습니다.");
      } else {
        appState.assemblySchedule.push({
          id: "sch-" + Date.now(),
          title: title,
          desc: desc,
          status: status,
          targetTab: targetTab,
          btnLabel: labelMap[targetTab] || "바로가기 →"
        });
        showToast("정기총회 식순 항목이 추가되었습니다.");
      }

      closeScheduleModal();
      saveStateToStorage();
      renderAll();
    }

    function deleteScheduleItem(schedId) {
      appState.assemblySchedule = (appState.assemblySchedule || []).filter(function(x) { return x.id !== schedId; });
      saveStateToStorage();
      renderAll();
      showToast("선택한 식순 항목이 삭제되었습니다.");
    }

    function toggleProjectorMode() {
      appState.projectorMode = !appState.projectorMode;
      const mainEl = document.getElementById("mainAppContainer");
      const labelEl = document.getElementById("projectorToggleLabel");
      if (appState.projectorMode) {
        mainEl.classList.add("projector-mode");
        labelEl.textContent = "단상 스크린 확대모드 ON";
        showToast("단상 프로젝터 스크린용 글자 확대 모드가 켜졌습니다.");
      } else {
        mainEl.classList.remove("projector-mode");
        labelEl.textContent = "단상 스크린 확대모드 OFF";
        showToast("일반 글자 크기로 전환되었습니다.");
      }
    }

    function exportAssemblyResultsCSV() {
      const rows = [
        ["안건번호", "발의자", "대상조항", "안건제목", "투표인원", "2/3가결기준", "찬성", "반대", "기권", "의결결과"]
      ];
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        rows.push([
          ag.codeName || ("제" + ag.orderNo + "호"),
          ag.proposer || "-",
          ag.targetArticle,
          '"' + ag.title.replace(/"/g, '""') + '"',
          t.totalAttendees,
          t.majorityThreshold,
          t.approve,
          t.reject,
          t.abstain,
          t.isAdopted ? "가결" : "부결"
        ]);
      });
      const csvContent = "\uFEFF" + rows.map(function(r) { return r.join(","); }).join("\n");
      triggerDownloadBlob(csvContent, "2026_삼성한우리합창단_단칙개정안_투표결과.csv", "text/csv;charset=utf-8;");
      showToast("총회 의결 결과 CSV 파일 다운로드가 시작되었습니다.");
    }

    function copyTextToClipboard(text, successMsg) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast(successMsg);
      } catch (err) {
        showToast("클립보드 복사에 실패했습니다.");
      }
      document.body.removeChild(textarea);
    }

    function copyShareLink() {
      const currentUrl = window.location && window.location.href && window.location.href.indexOf("http") === 0
        ? window.location.href
        : "https://hanuri-choir.github.io/assembly-2026/";
      const shareText = "[2026 삼성한우리합창단 정기총회 with ‘메리고잉 운영진’]\n단칙 검색·개정안 투표·단장 선거 접속 링크: " + currentUrl;
      copyTextToClipboard(shareText, "총회 단원 접속용 공유 링크가 클립보드에 복사되었습니다!");
    }

    function copyMinutesSummaryText() {
      let lines = [
        "■ 2026 삼성한우리합창단 정기총회 단칙 개정안 투표 결과 요약",
        "- 성원 보고: 재적 정단원 164명 중 현장참석 39명 + 쉐도우보팅 94명 = 총 127명 (정족수 110명 충족)",
        ""
      ];
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        lines.push(
          "• " + (ag.codeName || ("제" + ag.orderNo + "호")) + " [" + ag.targetArticle + " · 발의: " + (ag.proposer || "-") + "] " +
          "→ 찬성 " + t.approve + "(" + t.majorityThreshold + ") / 반대 " + t.reject + " / 기권 " + t.abstain + " (" +
          (t.isAdopted ? "가결" : "부결") + ")"
        );
      });
      copyTextToClipboard(lines.join("\n"), "총회 회의록 요약 텍스트가 클립보드에 복사되었습니다!");
    }

    let toastTimer = null;
    function showToast(msg) {
      const banner = document.getElementById("toastBanner");
      const textEl = document.getElementById("toastMessageText");
      textEl.textContent = msg;
      banner.classList.remove("hidden");
      banner.classList.add("flex");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function() {
        banner.classList.add("hidden");
        banner.classList.remove("flex");
      }, 3500);
    }

    window.addEventListener("DOMContentLoaded", function() {
      loadStateFromStorage();
      renderAll();
    });
