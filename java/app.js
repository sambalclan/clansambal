/**
 * Main Application Module
 * Orchestrates the data loading flow, global event listeners, and view switching.
 */
import { roleWeight, parseCoCDate } from './constants.js';
import { 
    fetchClanData, 
    fetchMembersIndex, 
} from './render.js';
import { renderCharts } from './charts.js';

// Global state variables
let allMembers = [];           
let latestClanData = null;     
let currentRoleFilter = 'all'; 
/**
 * UI View Controllers
 */
function switchView(viewId, updateHash = true) {
    document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden-section'));
    const target = document.getElementById(`section-${viewId}`);
    if (target) target.classList.remove('hidden-section');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${viewId}`);
    if (activeTab) activeTab.classList.add('active');
    if (updateHash) window.location.hash = viewId;
}

//berapa banyak member dalam clan
function updateMemberCount(count) {
    const el = document.getElementById('memberCount');
    if (el) el.innerText = `${count} / 50`;
}

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

function setupWarHistoryPickers() {
    warHistoryPickers.forEach(p => p.destroy());
    const startEl = document.getElementById('warStartDate');
    const endEl = document.getElementById('warEndDate');
    if (!startEl || !endEl) return;
    const sP = flatpickr(startEl, { 
        dateFormat: "Y-m-d", 
        disableMobile: true,
        onChange: (selectedDates) => {
            if (selectedDates.length > 0) eP.set('minDate', selectedDates[0]);
            filterWarHistory(); 
        } 
    });
    const eP = flatpickr(endEl, { 
        dateFormat: "Y-m-d", 
        disableMobile: true,
        onChange: (selectedDates) => {
            if (selectedDates.length > 0) sP.set('maxDate', selectedDates[0]);
            filterWarHistory(); 
        } 
    });
    warHistoryPickers = [sP, eP];
}

function handleInitialRoute() {
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'about') { switchView('about', false); return; }
    if (hash === 'members') { switchView(hash, false); }
    else if (hash === 'stats') {
        switchView('stats', false);
        renderCharts(fullWarHistory, document.getElementById('statsTimeRange')?.value || 'month');
    }
    else if (hash.startsWith('raids')) {
        const parts = hash.split('/');
        const subview = parts[1] || 'summary';
        switchView('raids', false);
        switchRaidSubView(subview, false);
    }
    else if (hash.startsWith('war/')) {
        const parts = hash.split('/');
        let detailFile = parts[2];
        if (detailFile && !detailFile.endsWith('.json')) detailFile += '.json';
        switchView('war', false);
        if (detailFile) loadWarDetail(detailFile, false); 
    } else if (hash === 'war') { switchView('war', false); }
}

function bindAboutPageEvents() {
    const btn = document.getElementById('viewWarHistoryBtn');
    if (btn) btn.onclick = () => { switchView('war'); };
}

async function handleMemberDateChange(dateValue, shouldFetch = true) {
    if (!dateValue) return;
    const snapshotName = `members_${dateValue.replace(/-/g, '')}.json`;
    try {
        let data = await fetchHistoricalMembers(snapshotName);
        allMembers = data.memberList || data.members || [];
        updateDisplay();
    } catch (e) {
        const fb = await fetchClanData(); allMembers = fb.memberList || fb.members || []; updateDisplay();
    }
}

//Role members

function updateDisplay() {
    const sortKey = document.getElementById('sortBy')?.value || 'league';
    let filtered = allMembers.filter(m => currentRoleFilter === 'all' || m.role === currentRoleFilter);
    updateMemberCount(filtered.length);
    filtered.sort((a, b) => {
        if (sortKey === 'role') return (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0);
        if (sortKey === 'league') {
            const lA = a.leagueTier?.id || a.league?.id || 0; const lB = b.leagueTier?.id || b.league?.id || 0;
            return lA !== lB ? lB - lA : (b.trophies || 0) - (a.trophies || 0);
        }
        return (b[sortKey] || 0) - (a[sortKey] || 0);
    });
    renderMembers(filtered);
}

function setRoleFilter(role, btn) {
    currentRoleFilter = role;
    document.querySelectorAll('#section-members .sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); updateDisplay();
}

function setWarResultFilter(filter, btn) {
    currentWarFilter = filter;
    document.querySelectorAll('#section-war .sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterWarHistory();
}

document.addEventListener('DOMContentLoaded', () => {
    preRoute(); init();
    document.getElementById('tab-about')?.addEventListener('click', () => { switchView('about'); if (latestClanData) renderAbout(latestClanData); bindAboutPageEvents(); });
    document.getElementById('tab-members')?.addEventListener('click', () => {
        switchView('members');
        currentRoleFilter = 'all';
        document.querySelectorAll('#section-members .sub-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#section-members [data-role="all"]')?.classList.add('active');
        updateDisplay();
    });

    document.getElementById('statsTimeRange')?.addEventListener('change', (e) => { renderCharts(fullWarHistory, e.target.value); });
    document.getElementById('sortBy')?.addEventListener('change', updateDisplay);
    document.getElementById('backToWarList')?.addEventListener('click', showWarList);
    document.getElementById('resetMembersFilters')?.addEventListener('click', () => {
        currentRoleFilter = 'all'; 
        document.querySelectorAll('#section-members .sub-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#section-members [data-role="all"]')?.classList.add('active');
        document.getElementById('sortBy').value = 'league';
        updateDisplay();
    });
    document.querySelectorAll('#section-members .sub-tab-btn').forEach(btn => { 
        if (btn.hasAttribute('data-role')) {
            btn.addEventListener('click', () => setRoleFilter(btn.getAttribute('data-role'), btn)); 
        }
    });
    document.addEventListener('click', () => { document.querySelectorAll('.info-tooltip').forEach(t => t.classList.remove('active')); });
});
