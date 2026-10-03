//badge foto clan dan nama clan
function updateHeader(name, badgeUrl) {
    const title = document.getElementById('pageTitle');
    const badge = document.getElementById('clanBadge');
    if (title) title.innerText = name;
    if (badge && badgeUrl) {
        badge.src = badgeUrl;
        badge.classList.remove('hidden');
    }
}


function preRoute() {
    const hash = window.location.hash.replace('#', '');
    const tabAbout = document.getElementById('tab-about');
    const tabMembers = document.getElementById('tab-members');
    if (!tabAbout || !tabMembers) return;
    [tabAbout, tabMembers].forEach(t => t.classList.remove('active'));
    if (!hash || hash === 'about') tabAbout.classList.add('active');
    else if (hash === 'members') tabMembers.classList.add('active');
}

async function init() {
    try {
        const clanData = await fetchClanData();
        latestClanData = clanData;
        allMembers = clanData.memberList || clanData.members || [];
        updateDisplay();
        renderAbout(latestClanData);
        bindAboutPageEvents();
        updateHeader(clanData.name, clanData.badgeUrls?.medium || clanData.badgeUrls?.small);
    } catch (e) { console.error("Could not load latest clan data.", e); }

    try {
        const memberIndex = await fetchMembersIndex();
        const todayStr = new Date().toISOString().split('T')[0];
        availableMemberDates = memberIndex.map(f => {
            const dateStr = f.replace('members_', '').replace('.json', '');
            return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
        });
        let bestDefaultDate = availableMemberDates[0] || todayStr;
        if (!availableMemberDates.includes(todayStr)) availableMemberDates.push(todayStr);
        if (fp) fp.destroy();
        fp = flatpickr("#memberDate", {
            defaultDate: bestDefaultDate, enable: availableMemberDates, dateFormat: "Y-m-d",
            disableMobile: true,
            onChange: function(selectedDates, dateStr) { handleMemberDateChange(dateStr); }
        });
    } catch (e) { console.warn("Could not setup member date filters.", e); }
    
    try {
        const raidIndex = await fetchRaidIndex();
        const raidDataPromises = raidIndex.reverse().map(async (filename) => {
            try {
                const data = await fetchRaidData(filename);
                const items = data.items || [data];
                return items.map(item => ({ ...item, filename }));
            } catch (e) { return null; }
        });
        const raidResults = await Promise.all(raidDataPromises);
        fullRaidHistory = raidResults.flat().filter(r => r !== null);
        setupRaidCalendar();
        handleInitialRoute();
    } catch (e) { console.error("Could not load raid history.", e); handleInitialRoute(); }
}

function setupRaidCalendar() {
    const calendarEl = document.getElementById('raidWeekendCalendar');
    if (!calendarEl || fullRaidHistory.length === 0) return;

    const getDateStr = (d) => {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const enabledDates = [];
    fullRaidHistory.forEach(r => {
        let current = parseCoCDate(r.startTime);
        const end = parseCoCDate(r.endTime);
        while (current <= end) {
            enabledDates.push(getDateStr(current));
            current.setUTCDate(current.getUTCDate() + 1);
        }
    });

    if (raidFp) raidFp.destroy();
    raidFp = flatpickr(calendarEl, {
        enable: enabledDates,
        dateFormat: "Y-m-d",
        defaultDate: enabledDates[0],
        disableMobile: true,
        onChange: (selectedDates) => {
            if (selectedDates.length === 0) return;
            const sel = selectedDates[0];
            const selectedStr = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, '0')}-${String(sel.getDate()).padStart(2, '0')}`;
            
            const idx = fullRaidHistory.findIndex(r => {
                let check = parseCoCDate(r.startTime);
                const rEnd = parseCoCDate(r.endTime);
                while (check <= rEnd) {
                    if (getDateStr(check) === selectedStr) return true;
                    check.setUTCDate(check.getUTCDate() + 1);
                }
                return false;
            });

            if (idx !== -1) {
                currentRaidIndex = idx;
                const activeSubTab = document.querySelector('#section-raids .sub-tab-btn.active')?.id.replace('raid-subtab-', '') || 'summary';
                switchRaidSubView(activeSubTab);
            }
        }
    });

    currentRaidIndex = 0;
    switchRaidSubView('summary', false);
}
