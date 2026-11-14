// =====================================================
// CampusCareer BD - app logic
// Data is stored in localStorage (demo/prototype only,
// this is not a real backend, SMS, or secure auth system).
// "SMS notifications" below are SIMULATED (shown as an
// in-app alert) since a real SMS gateway needs a backend.
// =====================================================

const ADMIN_EMAIL = "admin@campuscareer.bd";
const ADMIN_PASSWORD = "Admin@123";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEMO_EMAIL = "demo@campuscareer.bd";

const SKILL_CATALOG = {
    "Tech": ["HTML", "CSS", "JavaScript", "Python", "Java", "C++", "SQL", "React", "PHP", "Git", "WordPress"],
    "Design": ["Photoshop", "Illustrator", "Figma", "Canva", "UI/UX", "Video Editing", "Photography"],
    "Marketing & Sales": ["Social Media", "Content Writing", "SEO", "Facebook Ads", "Copywriting", "Sales"],
    "Office": ["MS Excel", "MS Word", "Typing", "Attention to Detail"],
    "Soft Skills": ["English Communication", "Bangla Communication", "Teaching", "Customer Support", "Public Speaking", "Teamwork", "Time Management", "Problem Solving"]
};

const AREAS = ["Mirpur", "Banani", "Dhanmondi", "Uttara", "Mohammadpur", "Gulshan", "Motijheel", "Farmgate", "Bashundhara", "Mohakhali"];
const LOCATION_OPTIONS = AREAS.concat(["Remote"]);

// ---------- STORAGE HELPERS ----------

function getStudents() { return JSON.parse(localStorage.getItem("students")) || []; }
function saveStudents(list) { localStorage.setItem("students", JSON.stringify(list)); }

function getEmployers() { return JSON.parse(localStorage.getItem("employers")) || []; }
function saveEmployers(list) { localStorage.setItem("employers", JSON.stringify(list)); }

function getJobs() { return JSON.parse(localStorage.getItem("jobsList")) || []; }
function saveJobs(list) { localStorage.setItem("jobsList", JSON.stringify(list)); }

function getApplications() {
    const list = JSON.parse(localStorage.getItem("applications")) || [];
    // ignore entries saved by very old versions (plain strings)
    return list.filter(a => a && typeof a === "object");
}
function saveApplications(list) { localStorage.setItem("applications", JSON.stringify(list)); }

function getCurrentUser() { return JSON.parse(localStorage.getItem("currentUser")); }
function setCurrentUser(user) { localStorage.setItem("currentUser", JSON.stringify(user)); }

function esc(str) {
    return String(str === undefined || str === null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fillSelect(id, options, firstLabel) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML =
        (firstLabel !== undefined ? `<option value="">${esc(firstLabel)}</option>` : "") +
        options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
}

fillSelect("locationFilter", LOCATION_OPTIONS, "All");
fillSelect("jobLocationInput", ["Dhaka (Any area)"].concat(LOCATION_OPTIONS));

// =====================================================
// NOTIFICATIONS (stored per recipient email)
// =====================================================

function getNotifications() { return JSON.parse(localStorage.getItem("notifications")) || []; }
function saveNotifications(list) { localStorage.setItem("notifications", JSON.stringify(list)); }

function addNotification(to, message) {
    if (!to) return;
    const list = getNotifications();
    list.push({
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        to: to, message: message, createdAt: new Date().toISOString(), read: false
    });
    saveNotifications(list.slice(-300));
}

function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " h ago";
    return new Date(iso).toLocaleDateString();
}

// =====================================================
// PROFILE COMPLETENESS
// =====================================================

function getProfileCompleteness(s) {
    const skillCount = (s.skills || []).length;
    const filled = v => !!(v && String(v).trim());
    const items = [
        { weight: 10, earned: (filled(s.name) && filled(s.university)) ? 10 : 0, tip: "Add your name and university" },
        { weight: 10, earned: filled(s.department) ? 10 : 0, tip: "Add your department" },
        { weight: 10, earned: filled(s.cgpa) ? 10 : 0, tip: "Add your CGPA" },
        { weight: 25, earned: skillCount >= 3 ? 25 : (skillCount >= 1 ? 15 : 0), tip: skillCount >= 1 ? "Select at least 3 skills" : "Select your skills" },
        { weight: 10, earned: filled(s.experience) ? 10 : 0, tip: "Describe your experience" },
        { weight: 10, earned: filled(s.projects) ? 10 : 0, tip: "Add projects or certificates" },
        { weight: 10, earned: (s.preferredAreas || []).length > 0 ? 10 : 0, tip: "Choose preferred work areas" },
        { weight: 15, earned: (s.classSchedule || []).length > 0 ? 15 : 0, tip: "Add your class schedule" }
    ];
    const percent = items.reduce((sum, i) => sum + i.earned, 0);
    const missing = items.filter(i => i.earned < i.weight).map(i => i.tip);
    return { percent, missing };
}

function renderCompleteness(containerId, student, showButton) {
    const el = document.getElementById(containerId);
    if (!el || !student) return;
    const c = getProfileCompleteness(student);
    el.innerHTML = `
        <div class="comp-head"><h3>Profile completeness</h3><strong>${c.percent}%</strong></div>
        <div class="comp-bar"><div class="comp-fill${c.percent === 100 ? " full" : ""}" style="width:${c.percent}%"></div></div>
        ${c.missing.length
            ? `<p class="comp-tip">Next steps: ${c.missing.slice(0, 3).map(esc).join(" • ")}</p>`
            : `<p class="comp-tip comp-done">🎉 Your profile is complete, so your match scores are as accurate as possible.</p>`}
        ${showButton && c.missing.length ? '<a href="profile.html" class="small-btn">Complete profile</a>' : ""}
    `;
}

function readProfileDraft() {
    const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
    const sp = chipPickers["skillPicker"];
    const ap = chipPickers["areaPicker"];
    return {
        name: val("profileName"), university: val("profileUniversity"),
        department: val("department"), cgpa: val("cgpa"),
        skills: sp ? sp.getSelected() : [],
        preferredAreas: ap ? ap.getSelected() : [],
        experience: val("experience"), projects: val("projects"),
        classSchedule: collectScheduleFromForm()
    };
}

// =====================================================
// ADMIN CHARTS (plain HTML/CSS bars, no libraries)
// =====================================================

function renderBarChart(containerId, items, emptyText) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items.length || items.every(i => i.value === 0)) {
        el.innerHTML = `<p class="chart-empty">${esc(emptyText || "No data yet")}</p>`;
        return;
    }
    const max = Math.max(...items.map(i => i.value));
    el.innerHTML = items.map(i => `
        <div class="bar-row">
            <span class="bar-label" title="${esc(i.label)}">${esc(i.label)}</span>
            <div class="bar-track"><div class="bar-fill${i.cls ? " " + i.cls : ""}" style="width:${Math.round(i.value / max * 100)}%"></div></div>
            <span class="bar-value">${i.value}</span>
        </div>`).join("");
}

function countSkills(lists) {
    const counts = {};
    lists.forEach(skills => (skills || []).forEach(sk => {
        const key = sk.toLowerCase();
        if (!counts[key]) counts[key] = { label: sk, value: 0 };
        counts[key].value++;
    }));
    return Object.values(counts).sort((a, b) => b.value - a.value);
}

function renderAdminCharts(students, jobs, applications) {
    const appsPerJob = jobs
        .map(j => ({ label: j.title, value: applications.filter(a => a.jobId === j.id).length }))
        .filter(i => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    renderBarChart("chartAppsPerJob", appsPerJob, "No applications yet.");

    const demand = countSkills(jobs.filter(j => j.status === "Approved").map(j => j.skills));
    const demandTop = demand.slice(0, 8);
    renderBarChart("chartSkills", demandTop, "No approved jobs yet.");

    const supply = countSkills(students.map(s => s.skills));
    renderBarChart("chartStudentSkills", supply.slice(0, 8), "No student has added skills yet.");

    if (students.length > 0 && demandTop.length) {
        const supplyKeys = supply.map(i => i.label.toLowerCase());
        const gaps = demandTop.filter(d => !supplyKeys.includes(d.label.toLowerCase())).slice(0, 4).map(d => d.label);
        if (gaps.length) {
            document.getElementById("chartSkills").insertAdjacentHTML("beforeend",
                `<p class="chart-note">⚠️ In demand but no student lists them: ${gaps.map(esc).join(", ")}</p>`);
        }
    }

    const statuses = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];
    renderBarChart("chartPipeline", statuses.map(st => ({
        label: st,
        value: applications.filter(a => (a.status || "Applied") === st).length,
        cls: "bar-fill--" + st.toLowerCase()
    })), "No applications yet.");
}

// ---------- DEMO DATA ----------

function getDemoJobs() {
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu"];
    const mk = (o) => Object.assign({ postedBy: DEMO_EMAIL, status: "Approved", experienceRequired: "No experience needed" }, o);

    return [
        mk({ title: "Software Development Intern", company: "ABC Technologies", location: "Dhanmondi", type: "Part-Time", salary: "8,000 BDT / Month",
            skills: ["HTML", "CSS", "JavaScript"], workingDays: weekdays, hoursStart: "15:00", hoursEnd: "19:00",
            description: "We are looking for a motivated student to work as a Software Development Intern. You will help our development team with frontend and backend tasks." }),
        mk({ title: "Graphic Design Intern", company: "Creative Studio", location: "Remote", type: "Flexible", salary: "6,000 BDT / Month",
            skills: ["Photoshop", "Illustrator", "Figma"], workingDays: allDays, hoursStart: "10:00", hoursEnd: "22:00",
            description: "Join our creative team to design social media graphics, posters and branding material for real clients." }),
        mk({ title: "Data Entry Assistant", company: "XYZ Company", location: "Mirpur", type: "Evening", salary: "5,000 BDT / Month",
            skills: ["MS Excel", "Typing", "Attention to Detail"], workingDays: weekdays, hoursStart: "18:00", hoursEnd: "21:00",
            description: "Enter and organize company records accurately. Great opportunity for students who are detail-oriented and comfortable with spreadsheets." }),
        mk({ title: "Marketing Intern", company: "Digital Agency BD", location: "Banani", type: "Part-Time", salary: "7,000 BDT / Month",
            skills: ["Social Media", "Content Writing", "Canva"], workingDays: ["Fri", "Sat"], hoursStart: "10:00", hoursEnd: "16:00",
            description: "Support our marketing team with content creation, social media scheduling and campaign reporting." }),
        mk({ title: "Home Tutor (Math & English)", company: "Bright Minds Academy", location: "Mohammadpur", type: "Evening", salary: "8,000 BDT / Month",
            skills: ["Teaching", "English Communication", "Bangla Communication", "Time Management"], workingDays: ["Sun", "Tue", "Thu"], hoursStart: "17:00", hoursEnd: "20:00",
            description: "Teach school students (Class 6-9) Math and English at their homes. Lesson plans and study material are provided." }),
        mk({ title: "Content Writer", company: "Wordcraft Media", location: "Remote", type: "Flexible", salary: "6,500 BDT / Month",
            skills: ["Content Writing", "English Communication", "SEO"], workingDays: allDays, hoursStart: "10:00", hoursEnd: "20:00",
            description: "Write blog posts and product descriptions for international clients. Work from anywhere and set your own schedule within deadlines." }),
        mk({ title: "Video Editor (Part-Time)", company: "Reel Factory", location: "Uttara", type: "Part-Time", salary: "9,000 BDT / Month",
            skills: ["Video Editing", "Photoshop", "Time Management"], workingDays: weekdays, hoursStart: "14:00", hoursEnd: "18:00",
            description: "Edit short videos and reels for brands and creators. You will work with our creative team and learn professional editing workflows." }),
        mk({ title: "Customer Support Executive", company: "ShopEase BD", location: "Gulshan", type: "Evening", salary: "8,500 BDT / Month",
            skills: ["Customer Support", "Bangla Communication", "English Communication", "Typing"], workingDays: weekdays, hoursStart: "18:00", hoursEnd: "22:00",
            description: "Answer customer chats and calls for our online store, solve order issues and keep customers happy." }),
        mk({ title: "Weekend Sales Assistant", company: "Style Hub", location: "Bashundhara", type: "Part-Time", salary: "700 BDT / Day",
            skills: ["Sales", "Bangla Communication", "Teamwork"], workingDays: ["Fri", "Sat"], hoursStart: "11:00", hoursEnd: "19:00",
            description: "Help customers in our fashion store on weekends. Friendly, energetic students are encouraged to apply." }),
        mk({ title: "Data Analyst Intern", company: "InsightBD", location: "Mohakhali", type: "Part-Time", salary: "10,000 BDT / Month",
            skills: ["Python", "SQL", "MS Excel"], workingDays: weekdays, hoursStart: "15:00", hoursEnd: "19:00",
            description: "Clean and analyse business data, build simple dashboards and present findings to the team." }),
        mk({ title: "WordPress Web Assistant", company: "PixelPulse", location: "Remote", type: "Flexible", salary: "7,500 BDT / Month",
            skills: ["WordPress", "HTML", "CSS"], workingDays: allDays, hoursStart: "10:00", hoursEnd: "20:00",
            description: "Maintain and update client websites built on WordPress: content updates, small layout fixes and plugin setup." }),
        mk({ title: "UI/UX Design Intern", company: "Designly", location: "Dhanmondi", type: "Part-Time", salary: "8,000 BDT / Month",
            skills: ["Figma", "UI/UX", "Canva"], workingDays: weekdays, hoursStart: "09:00", hoursEnd: "13:00",
            description: "Design app screens and prototypes in Figma with our product designers. A great start for a design portfolio." }),
        mk({ title: "Library & Office Assistant", company: "Campus Library Services", location: "Farmgate", type: "Part-Time", salary: "5,500 BDT / Month",
            skills: ["MS Word", "Typing", "Attention to Detail"], workingDays: weekdays, hoursStart: "08:00", hoursEnd: "12:00",
            description: "Organise books and records, prepare documents and help visitors. A calm, steady job that fits morning availability." })
    ];
}

function seedJobsIfEmpty() {
    const demo = getDemoJobs();
    let jobs = getJobs();
    let changed = false;

    // 1) migrate jobs saved by an older version of the site (no status / schedule fields)
    jobs = jobs.map(job => {
        if (job.status) return job;
        changed = true;
        const fresh = job.postedBy === DEMO_EMAIL ? demo.find(d => d.title === job.title) : null;
        if (fresh) return Object.assign({}, fresh, { id: job.id });
        return Object.assign({
            status: "Approved", workingDays: ["Sun", "Mon", "Tue", "Wed", "Thu"],
            hoursStart: "10:00", hoursEnd: "16:00", experienceRequired: ""
        }, job);
    });

    // 2) add the demo jobs once (so removing one later does not bring it back)
    if (localStorage.getItem("demoSeedVersion") !== "3") {
        demo.forEach(d => {
            if (!jobs.some(j => j.postedBy === DEMO_EMAIL && j.title === d.title)) {
                const maxId = jobs.length ? Math.max(...jobs.map(j => j.id)) : 0;
                jobs.push(Object.assign({}, d, { id: maxId + 1 }));
                changed = true;
            }
        });
        localStorage.setItem("demoSeedVersion", "3");
    }

    if (changed) saveJobs(jobs);
}
seedJobsIfEmpty();

function seedDemoEmployerIfNeeded() {
    const employers = getEmployers();
    if (!employers.some(e => e.email === DEMO_EMAIL)) {
        employers.push({
            companyName: "CampusCareer BD Partner Jobs", email: DEMO_EMAIL,
            industry: "Various", password: "", verified: true
        });
        saveEmployers(employers);
    }
}
seedDemoEmployerIfNeeded();

function nextJobId() {
    const jobs = getJobs();
    return jobs.length === 0 ? 1 : Math.max(...jobs.map(j => j.id)) + 1;
}

// =====================================================
// CHIP PICKER (skills / areas)
// =====================================================

const chipPickers = {};

function createChipPicker(containerId, groups, initial, opts) {
    const el = document.getElementById(containerId);
    if (!el) return null;

    const allowCustom = !opts || opts.allowCustom !== false;
    const catalogLower = {};
    Object.keys(groups).forEach(g => groups[g].forEach(s => { catalogLower[s.toLowerCase()] = s; }));

    let selected = [];

    function add(name) {
        const clean = String(name).replace(/["<>]/g, "").trim();
        if (!clean) return false;
        const canon = catalogLower[clean.toLowerCase()] || clean;
        if (selected.some(s => s.toLowerCase() === canon.toLowerCase())) return false;
        selected.push(canon);
        return true;
    }

    function remove(name) {
        selected = selected.filter(s => s !== name);
    }

    (initial || []).forEach(add);

    function render(focusInput) {
        const inputEl = el.querySelector(".chip-custom-input");
        const keep = inputEl ? inputEl.value : "";
        const customs = selected.filter(s => !catalogLower[s.toLowerCase()]);

        let html = "";
        Object.keys(groups).forEach(group => {
            html += `<div class="skill-group"><h4>${esc(group)}</h4><div class="chip-row">` +
                groups[group].map(s =>
                    `<button type="button" class="chip${selected.includes(s) ? " selected" : ""}" data-skill="${esc(s)}">${esc(s)}</button>`
                ).join("") +
                `</div></div>`;
        });

        if (customs.length) {
            html += `<div class="skill-group"><h4>Added by you</h4><div class="chip-row">` +
                customs.map(s => `<button type="button" class="chip selected" data-skill="${esc(s)}">${esc(s)} ✕</button>`).join("") +
                `</div></div>`;
        }

        if (allowCustom) {
            html += `<div class="chip-add-row">
                <input type="text" class="chip-custom-input" placeholder="Add another skill..." maxlength="40">
                <button type="button" class="small-btn chip-add-btn">Add</button>
            </div>`;
        }

        html += `<p class="chip-count">${selected.length} selected</p>`;
        el.innerHTML = html;

        const newInput = el.querySelector(".chip-custom-input");
        if (newInput) {
            newInput.value = keep;
            if (focusInput) newInput.focus();
        }
    }

    el.onclick = function (e) {
        const chip = e.target.closest(".chip");
        if (chip && el.contains(chip)) {
            const skill = chip.getAttribute("data-skill");
            if (selected.includes(skill)) remove(skill); else add(skill);
            render(false);
            return;
        }
        if (e.target.closest(".chip-add-btn")) {
            const input = el.querySelector(".chip-custom-input");
            if (input && add(input.value)) input.value = "";
            render(true);
        }
    };

    el.onkeydown = function (e) {
        if (e.key === "Enter" && e.target.classList.contains("chip-custom-input")) {
            e.preventDefault();
            if (add(e.target.value)) e.target.value = "";
            render(true);
        }
    };

    render(false);

    const picker = { getSelected: () => selected.slice() };
    chipPickers[containerId] = picker;
    return picker;
}

// =====================================================
// SMART MATCH SCORE
// =====================================================

// skills overlap (0-100) or null when it cannot be computed
function computeMatchScore(studentSkills, jobSkills) {
    if (!studentSkills || studentSkills.length === 0) return null;
    if (!jobSkills || jobSkills.length === 0) return null;

    const norm = arr => arr.map(s => s.toLowerCase().trim());
    const sSkills = norm(studentSkills);
    const jSkills = norm(jobSkills);

    const overlap = jSkills.filter(skill => sSkills.includes(skill));
    return Math.round((overlap.length / jSkills.length) * 100);
}

function getSkillGap(studentSkills, jobSkills) {
    const sSkills = (studentSkills || []).map(s => s.toLowerCase().trim());
    const have = [];
    const missing = [];
    (jobSkills || []).forEach(skill => {
        if (sSkills.includes(skill.toLowerCase().trim())) have.push(skill);
        else missing.push(skill);
    });
    return { have, missing };
}

function locationScore(preferredAreas, jobLocation) {
    const loc = (jobLocation || "").toLowerCase().trim();
    if (!loc) return null;
    const prefs = (preferredAreas || []).map(a => a.toLowerCase());

    if (loc === "remote") return prefs.includes("remote") ? 100 : 85;
    if (prefs.length === 0) return null;
    if (prefs.some(p => p !== "remote" && loc.includes(p))) return 100;
    if (loc.startsWith("dhaka")) return 70;
    return 40;
}

function availabilityScore(availability, job) {
    if (!availability) return null;
    const cat = getJobHourCategory(job);
    if (availability === "Flexible" || cat === "Flexible") return 100;
    return availability === cat ? 100 : 40;
}

function scheduleScore(classSchedule, job) {
    if (!classSchedule || classSchedule.length === 0) return null;
    return hasScheduleConflict(classSchedule, job) ? 0 : 100;
}

// Weighted overall score: skills 55%, location 20%, preferred hours 15%, class schedule 10%.
// Parts that cannot be evaluated (e.g. no preferred areas set) are left out and weights re-balance.
function computeSmartMatch(student, job) {
    if (!student) return null;
    const skills = computeMatchScore(student.skills, job.skills);
    if (skills === null) return null;

    const parts = [
        { key: "skills", label: "Skills", weight: 55, value: skills },
        { key: "location", label: "Location", weight: 20, value: locationScore(student.preferredAreas, job.location) },
        { key: "hours", label: "Preferred hours", weight: 15, value: availabilityScore(student.availability, job) },
        { key: "schedule", label: "Class schedule", weight: 10, value: scheduleScore(student.classSchedule, job) }
    ];

    const active = parts.filter(p => p.value !== null);
    const totalWeight = active.reduce((sum, p) => sum + p.weight, 0);
    const score = Math.round(active.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight);
    return { score, parts };
}

function matchLabel(match, student) {
    if (match) return match.score + "% Match";
    return student ? "Add skills to see match" : "Login to see match";
}

function getLoggedInStudent() {
    const user = getCurrentUser();
    if (!user || user.role !== "student") return null;
    return getStudents().find(s => s.email === user.email) || null;
}

// ---------- CLASS SCHEDULE / CONFLICT CHECK ----------

function timeToMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}

function hasScheduleConflict(classSchedule, job) {
    if (!classSchedule || classSchedule.length === 0) return false;
    if (!job.workingDays || !job.hoursStart || !job.hoursEnd) return false;

    const jobStart = timeToMinutes(job.hoursStart);
    const jobEnd = timeToMinutes(job.hoursEnd);

    return classSchedule.some(slot => {
        if (!job.workingDays.includes(slot.day)) return false;
        const sStart = timeToMinutes(slot.start);
        const sEnd = timeToMinutes(slot.end);
        if (sStart === null || sEnd === null) return false;
        return rangesOverlap(sStart, sEnd, jobStart, jobEnd);
    });
}

// Bangladesh weekend = Friday & Saturday
function getJobHourCategory(job) {
    if (job.type === "Flexible") return "Flexible";
    if (job.workingDays && job.workingDays.length > 0 && job.workingDays.every(d => d === "Fri" || d === "Sat")) {
        return "Weekend";
    }
    const start = timeToMinutes(job.hoursStart);
    if (start === null) return "Flexible";
    if (start < 12 * 60) return "Morning";
    if (start < 17 * 60) return "Afternoon";
    return "Evening";
}

// ---------- CLASS SCHEDULE ROW UI (profile.html) ----------

let scheduleRowCount = 0;

function buildScheduleRowHTML(day, start, end) {
    const rowId = "sched_" + (scheduleRowCount++);
    const dayOptions = DAYS.map(d => `<option value="${d}" ${d === day ? "selected" : ""}>${d}</option>`).join("");
    return `
        <div class="schedule-row" id="${rowId}">
            <select class="sched-day">${dayOptions}</select>
            <input type="time" class="sched-start" value="${start || "09:00"}">
            <span>to</span>
            <input type="time" class="sched-end" value="${end || "10:00"}">
            <button type="button" class="small-btn danger-btn" onclick="document.getElementById('${rowId}').remove()">✕</button>
        </div>
    `;
}

function renderScheduleRows(schedule) {
    const container = document.getElementById("scheduleRows");
    if (!container) return;
    container.innerHTML = "";
    if (schedule && schedule.length > 0) {
        schedule.forEach(slot => container.insertAdjacentHTML("beforeend", buildScheduleRowHTML(slot.day, slot.start, slot.end)));
    }
}

function collectScheduleFromForm() {
    const rows = document.querySelectorAll("#scheduleRows .schedule-row");
    const schedule = [];
    rows.forEach(row => {
        const day = row.querySelector(".sched-day").value;
        const start = row.querySelector(".sched-start").value;
        const end = row.querySelector(".sched-end").value;
        if (day && start && end) schedule.push({ day, start, end });
    });
    return schedule;
}

const addScheduleRowBtn = document.getElementById("addScheduleRowBtn");
if (addScheduleRowBtn) {
    addScheduleRowBtn.addEventListener("click", function () {
        document.getElementById("scheduleRows").insertAdjacentHTML("beforeend", buildScheduleRowHTML());
    });
}

// =====================================================
// STUDENT: REGISTER / LOGIN
// =====================================================

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const university = document.getElementById("university").value.trim();
        const password = document.getElementById("password").value;

        const students = getStudents();
        if (students.some(s => s.email === email)) {
            alert("An account with this email already exists!");
            return;
        }

        students.push({
            name, email, university, password,
            department: "", cgpa: "", experience: "", projects: "",
            skills: [], preferredAreas: [], availability: "Morning", classSchedule: [], verified: false
        });
        saveStudents(students);

        alert("Registration Successful!");
        window.location.href = "login.html";
    });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        const student = getStudents().find(s => s.email === email && s.password === password);
        const errorEl = document.getElementById("loginError");

        if (student) {
            setCurrentUser({ role: "student", email: student.email });
            window.location.href = "student-dashboard.html";
        } else {
            if (errorEl) errorEl.textContent = "Invalid email or password!";
            else alert("Invalid email or password!");
        }
    });
}

// =====================================================
// EMPLOYER: REGISTER / LOGIN
// =====================================================

const employerRegisterForm = document.getElementById("employerRegisterForm");
if (employerRegisterForm) {
    employerRegisterForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const companyName = document.getElementById("companyName").value.trim();
        const email = document.getElementById("companyEmail").value.trim().toLowerCase();
        const industry = document.getElementById("industry").value.trim();
        const password = document.getElementById("companyPassword").value;

        const employers = getEmployers();
        const errorEl = document.getElementById("employerRegisterError");

        if (employers.some(e => e.email === email)) {
            if (errorEl) errorEl.textContent = "An employer account with this email already exists!";
            else alert("An employer account with this email already exists!");
            return;
        }

        employers.push({ companyName, email, industry, password, verified: false });
        saveEmployers(employers);

        alert("Employer Registration Successful! Your account shows as 'Pending Verification' until Admin verifies it.");
        window.location.href = "employer-login.html";
    });
}

const employerLoginForm = document.getElementById("employerLoginForm");
if (employerLoginForm) {
    employerLoginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const email = document.getElementById("employerLoginEmail").value.trim().toLowerCase();
        const password = document.getElementById("employerLoginPassword").value;

        const employer = getEmployers().find(e => e.email === email && e.password === password && password !== "");
        const errorEl = document.getElementById("employerLoginError");

        if (employer) {
            setCurrentUser({ role: "employer", email: employer.email });
            window.location.href = "employer-dashboard.html";
        } else {
            if (errorEl) errorEl.textContent = "Invalid email or password!";
            else alert("Invalid email or password!");
        }
    });
}

// =====================================================
// ADMIN: LOGIN
// =====================================================

const adminLoginForm = document.getElementById("adminLoginForm");
if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const email = document.getElementById("adminLoginEmail").value.trim().toLowerCase();
        const password = document.getElementById("adminLoginPassword").value;
        const errorEl = document.getElementById("adminLoginError");

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            setCurrentUser({ role: "admin", email: ADMIN_EMAIL });
            window.location.href = "admin-dashboard.html";
        } else {
            if (errorEl) errorEl.textContent = "Invalid admin credentials!";
            else alert("Invalid admin credentials!");
        }
    });
}

// =====================================================
// LOGOUT (shared)
// =====================================================

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

// =====================================================
// SIMULATED SMS NOTIFICATION
// =====================================================

function sendSimulatedSMS(message) {
    // Demo only - a real deployment would call an SMS gateway API from a backend.
    console.log("[Simulated SMS] " + message);
    alert("📩 SMS Notification (simulated):\n" + message);
}

// =====================================================
// STUDENT DASHBOARD
// =====================================================

const welcomeText = document.getElementById("welcomeText");
if (welcomeText && document.getElementById("appliedCount")) {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        window.location.href = "login.html";
    } else {
        const student = getStudents().find(s => s.email === user.email);
        welcomeText.textContent = "Welcome, " + (student ? student.name : "Student") + "!" + (student && student.verified ? " ✅" : "");

        renderCompleteness("profileCompleteness", student, true);

        const applications = getApplications().filter(a => a.studentEmail === user.email);
        const approvedJobs = getJobs().filter(j => j.status === "Approved");

        document.getElementById("appliedCount").textContent = applications.length;
        document.getElementById("shortlistedCount").textContent = applications.filter(a => a.status === "Shortlisted").length;
        document.getElementById("interviewCount").textContent = applications.filter(a => a.status === "Interview").length;

        const schedule = student ? student.classSchedule : [];
        const rows = approvedJobs.map(j => ({
            job: j,
            match: computeSmartMatch(student, j),
            conflict: hasScheduleConflict(schedule, j)
        }));

        const scored = rows.filter(r => r.match);
        const avgMatchEl = document.getElementById("profileMatchAvg");
        if (avgMatchEl) {
            avgMatchEl.textContent = scored.length
                ? Math.round(scored.reduce((sum, r) => sum + r.match.score, 0) / scored.length) + "%"
                : "--";
        }

        const recommendedEl = document.getElementById("recommendedJobs");
        if (recommendedEl) {
            const ranked = rows
                .slice()
                .sort((a, b) => (b.match ? b.match.score : -1) - (a.match ? a.match.score : -1))
                .slice(0, 3);

            recommendedEl.innerHTML = "";
            if (!scored.length) {
                recommendedEl.innerHTML = `<p class="hint-text">Add your skills in <a href="profile.html">your profile</a> to get personalised recommendations.</p>`;
            }
            if (ranked.length === 0) {
                recommendedEl.innerHTML += "<p>No jobs available right now.</p>";
            }
            ranked.forEach(({ job, match, conflict }) => {
                recommendedEl.innerHTML += `
                    <div class="job-card dashboard-job">
                        <div>
                            <h3>${esc(job.title)} ${conflict ? '<span class="badge-warning">Schedule Conflict</span>' : ""}</h3>
                            <p>${esc(job.company)} • ${esc(job.location)}</p>
                        </div>
                        <strong>${match ? match.score + "% Match" : "Complete profile"}</strong>
                        <a href="job-details.html?id=${job.id}" class="small-btn">View Job</a>
                    </div>
                `;
            });
        }

        const applicationList = document.getElementById("applicationList");
        if (applicationList && applications.length > 0) {
            applicationList.innerHTML = "";
            const allJobs = getJobs();
            applications.slice().reverse().forEach(app => {
                const job = allJobs.find(j => j.id === app.jobId);
                applicationList.innerHTML += `
                    <div class="job-card dashboard-job">
                        <div>
                            <h3>${job ? esc(job.title) : "Job removed"}</h3>
                            <p>Status: <b>${esc(app.status || "Applied")}</b>${app.interviewAt ? " • Interview: " + esc(app.interviewAt) : ""}</p>
                        </div>
                    </div>
                `;
            });
        }
    }
}

// =====================================================
// APPLY JOB (student, from job-details.html)
// =====================================================

function applyJob(jobId) {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        alert("Please login as a student to apply.");
        window.location.href = "login.html";
        return;
    }

    const applications = getApplications();
    if (applications.some(a => a.studentEmail === user.email && a.jobId === jobId)) {
        alert("You already applied for this job!");
        return;
    }

    applications.push({
        studentEmail: user.email, jobId: jobId,
        appliedAt: new Date().toISOString(), status: "Applied", interviewAt: null
    });
    saveApplications(applications);
    const appliedJob = getJobs().find(j => j.id === jobId);
    const me = getStudents().find(st => st.email === user.email);
    if (appliedJob) addNotification(appliedJob.postedBy, `📥 ${me ? me.name : "A student"} applied for "${appliedJob.title}".`);
    alert("Application submitted successfully!");
}

// =====================================================
// JOBS PAGE (list + search + filters, best match first)
// =====================================================

const jobsGrid = document.getElementById("jobsGrid");
if (jobsGrid) {
    searchJobs();
}

function renderJobsGrid(jobs) {
    const student = getLoggedInStudent();
    const schedule = student ? student.classSchedule : null;

    if (jobs.length === 0) {
        jobsGrid.innerHTML = "<p>No jobs found.</p>";
        return;
    }

    const rows = jobs.map(job => ({
        job,
        match: computeSmartMatch(student, job),
        conflict: hasScheduleConflict(schedule, job)
    }));

    if (student) {
        rows.sort((a, b) => (b.match ? b.match.score : -1) - (a.match ? a.match.score : -1));
    }

    jobsGrid.innerHTML = "";
    rows.forEach(({ job, match, conflict }) => {
        jobsGrid.innerHTML += `
            <div class="job-item">
                <span class="match">${esc(matchLabel(match, student))}</span>
                <h3>${esc(job.title)}</h3>
                <p>${esc(job.company)}</p>
                <p>📍 ${esc(job.location)}</p>
                <p>🕒 ${esc(job.type)} (${esc(job.hoursStart || "")}–${esc(job.hoursEnd || "")})</p>
                <p>💰 ${esc(job.salary)}</p>
                ${conflict ? '<p class="badge-warning">⚠️ Conflicts with your class schedule</p>' : ""}
                <a href="job-details.html?id=${job.id}" class="small-btn">View Details</a>
            </div>
        `;
    });
}

function searchJobs() {
    const inputEl = document.getElementById("jobSearch");
    const input = inputEl ? inputEl.value.toLowerCase() : "";
    const hoursFilterEl = document.getElementById("hoursFilter");
    const hoursFilter = hoursFilterEl ? hoursFilterEl.value : "";
    const locationFilterEl = document.getElementById("locationFilter");
    const locationFilter = locationFilterEl ? locationFilterEl.value.toLowerCase() : "";

    const filtered = getJobs().filter(job => {
        if (job.status !== "Approved") return false;
        const matchesText = job.title.toLowerCase().includes(input) || job.company.toLowerCase().includes(input);
        const matchesHours = !hoursFilter || getJobHourCategory(job) === hoursFilter;
        const matchesLocation = !locationFilter || (job.location || "").toLowerCase().includes(locationFilter);
        return matchesText && matchesHours && matchesLocation;
    });
    renderJobsGrid(filtered);
}

// =====================================================
// JOB DETAILS PAGE
// =====================================================

const jobDetailsCard = document.getElementById("jobDetailsCard");
if (jobDetailsCard) {
    const params = new URLSearchParams(window.location.search);
    const jobId = parseInt(params.get("id"));
    const job = getJobs().find(j => j.id === jobId);
    const viewer = getCurrentUser();
    const canView = job && (job.status === "Approved" || (viewer && (viewer.role === "admin" || viewer.email === job.postedBy)));

    if (!job || !canView) {
        jobDetailsCard.innerHTML = "<p>Job not found. It may have been removed or is awaiting approval.</p>";
    } else {
        const student = getLoggedInStudent();
        const match = computeSmartMatch(student, job);
        const gap = getSkillGap(student ? student.skills : [], job.skills);
        const conflict = student ? hasScheduleConflict(student.classSchedule, job) : false;
        const employer = getEmployers().find(e => e.email === job.postedBy);

        const matchHTML = match
            ? `<div class="match-box">
                    <p class="match-line">✅ <b>${match.score}% Smart Match</b> with your profile</p>
                    <div class="match-breakdown">
                        ${match.parts.filter(p => p.value !== null).map(p => `
                            <div class="mb-row">
                                <span>${esc(p.label)}</span>
                                <div class="mb-bar"><div class="mb-fill" style="width:${p.value}%"></div></div>
                                <span class="mb-val">${p.value}%</span>
                            </div>`).join("")}
                    </div>
               </div>`
            : `<p class="match-line">${student ? "Add skills to your profile to see your match score." : "Login as a student and add skills to see your match score."}</p>`;

        jobDetailsCard.innerHTML = `
            <h1 id="jobTitle">${esc(job.title)}</h1>
            <p id="companyName">${esc(job.company)} ${employer && employer.verified ? '<span class="badge-verified">✔ Verified Employer</span>' : ""}</p>
            <div class="job-info">
                <p>📍 ${esc(job.location)}</p>
                <p>🕒 ${esc(job.type)} (${esc(job.hoursStart || "")}–${esc(job.hoursEnd || "")}, ${esc((job.workingDays || []).join(", "))})</p>
                <p>💰 ${esc(job.salary)}</p>
            </div>
            ${job.experienceRequired ? `<p>🧳 Experience required: ${esc(job.experienceRequired)}</p>` : ""}

            ${matchHTML}

            ${conflict ? `<p class="badge-warning">⚠️ This job's hours conflict with your saved class schedule.</p>` : ""}

            <h2>Job Description</h2>
            <p>${esc(job.description)}</p>

            <h2>Required Skills</h2>
            <div class="skills">
                ${job.skills.map(s => `<span class="${gap.have.includes(s) ? "skill-have" : ""}">${esc(s)}</span>`).join("")}
            </div>

            ${student ? `
                <h2>Skill Gap</h2>
                <p>${gap.have.length ? "✅ You already have: " + gap.have.map(esc).join(", ") : "You don't have any of the required skills yet."}</p>
                ${gap.missing.length ? `<p>❌ Missing: ${gap.missing.map(esc).join(", ")} - consider learning these to boost your match.</p>` : `<p>🎉 You meet all the required skills!</p>`}
            ` : ""}

            <button class="apply-btn" onclick="applyJob(${job.id})">Apply Now</button>
        `;
    }
}

// =====================================================
// PROFILE LOAD / SAVE
// =====================================================

const profileName = document.getElementById("profileName");
if (profileName) {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        window.location.href = "login.html";
    } else {
        const student = getStudents().find(s => s.email === user.email);
        if (student) {
            profileName.value = student.name || "";
            document.getElementById("profileUniversity").value = student.university || "";
            document.getElementById("department").value = student.department || "";
            document.getElementById("cgpa").value = student.cgpa || "";
            document.getElementById("experience").value = student.experience || "";
            document.getElementById("projects").value = student.projects || "";
            document.getElementById("availability").value = student.availability || "Morning";
            renderScheduleRows(student.classSchedule || []);

            createChipPicker("skillPicker", SKILL_CATALOG, student.skills || [], { allowCustom: true });
            createChipPicker("areaPicker", { "Where can you work?": LOCATION_OPTIONS }, student.preferredAreas || [], { allowCustom: false });

            const badgeEl = document.getElementById("verifiedBadge");
            if (badgeEl) badgeEl.innerHTML = student.verified ? '<span class="badge-verified">✔ Verified</span>' : '<span class="badge-pending">Pending Verification</span>';
        } else {
            createChipPicker("skillPicker", SKILL_CATALOG, [], { allowCustom: true });
            createChipPicker("areaPicker", { "Where can you work?": LOCATION_OPTIONS }, [], { allowCustom: false });
        }
    }
}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
    const refreshProfileBar = () => renderCompleteness("profileBar", readProfileDraft(), false);
    profileForm.addEventListener("input", refreshProfileBar);
    profileForm.addEventListener("change", refreshProfileBar);
    profileForm.addEventListener("click", () => setTimeout(refreshProfileBar, 0));
    refreshProfileBar();

    profileForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const user = getCurrentUser();
        if (!user || user.role !== "student") return;

        const students = getStudents();
        const index = students.findIndex(s => s.email === user.email);
        if (index === -1) return;

        const skillPicker = chipPickers["skillPicker"];
        const areaPicker = chipPickers["areaPicker"];

        students[index].name = document.getElementById("profileName").value.trim();
        students[index].university = document.getElementById("profileUniversity").value.trim();
        students[index].department = document.getElementById("department").value.trim();
        students[index].cgpa = document.getElementById("cgpa").value.trim();
        students[index].skills = skillPicker ? skillPicker.getSelected() : (students[index].skills || []);
        students[index].preferredAreas = areaPicker ? areaPicker.getSelected() : (students[index].preferredAreas || []);
        students[index].experience = document.getElementById("experience").value.trim();
        students[index].projects = document.getElementById("projects").value.trim();
        students[index].availability = document.getElementById("availability").value;
        students[index].classSchedule = collectScheduleFromForm();

        saveStudents(students);

        const msg = document.getElementById("profileMessage");
        if (msg) msg.textContent = "Profile updated successfully!";
        else alert("Profile updated successfully!");
    });
}

// =====================================================
// CV BUILDER
// =====================================================

const cvSheet = document.getElementById("cvSheet");
if (cvSheet) {
    const user = getCurrentUser();
    if (!user || user.role !== "student") {
        window.location.href = "login.html";
    } else {
        const student = getStudents().find(s => s.email === user.email);
        if (!student) {
            cvSheet.innerHTML = "<p>Profile not found.</p>";
        } else {
            const areas = (student.preferredAreas || []);
            cvSheet.innerHTML = `
                <div class="cv-header">
                    <h1>${esc(student.name)}</h1>
                    <p>${esc(student.university)}${student.department ? " • " + esc(student.department) : ""}${student.cgpa ? " • CGPA: " + esc(student.cgpa) : ""}</p>
                    <p>${esc(student.email)}</p>
                </div>

                <div class="cv-section">
                    <h2>Skills</h2>
                    <p>${(student.skills || []).length ? student.skills.map(esc).join(", ") : "Not added yet"}</p>
                </div>

                <div class="cv-section">
                    <h2>Experience</h2>
                    <p>${student.experience ? esc(student.experience).replace(/\n/g, "<br>") : "Not added yet"}</p>
                </div>

                <div class="cv-section">
                    <h2>Projects &amp; Certificates</h2>
                    <p>${student.projects ? esc(student.projects).replace(/\n/g, "<br>") : "Not added yet"}</p>
                </div>

                <div class="cv-section">
                    <h2>Availability</h2>
                    <p>${esc(student.availability || "Not set")}${areas.length ? " • Preferred areas: " + areas.map(esc).join(", ") : ""}</p>
                </div>
            `;
        }
    }
}

// =====================================================
// EMPLOYER DASHBOARD
// =====================================================

const employerJobList = document.getElementById("employerJobList");
if (employerJobList) {
    const user = getCurrentUser();
    if (!user || user.role !== "employer") {
        window.location.href = "employer-login.html";
    } else {
        renderEmployerDashboard(user);
    }
}

function renderEmployerDashboard(user) {
    const employer = getEmployers().find(e => e.email === user.email);
    const welcome = document.getElementById("welcomeText");
    if (welcome) welcome.textContent = "Welcome, " + (employer ? employer.companyName : "Employer") + "!" + (employer && employer.verified ? " ✅" : " (Pending Verification)");

    const myJobs = getJobs().filter(j => j.postedBy === user.email);
    const applications = getApplications();
    const myJobIds = myJobs.map(j => j.id);
    const myApplications = applications.filter(a => myJobIds.includes(a.jobId));

    document.getElementById("jobCount").textContent = myJobs.length;
    document.getElementById("totalApplicants").textContent = myApplications.length;
    document.getElementById("shortlistedCount").textContent = myApplications.filter(a => a.status === "Shortlisted").length;
    document.getElementById("activeJobsCount").textContent = myJobs.filter(j => j.status === "Approved").length;

    const employerJobListEl = document.getElementById("employerJobList");
    employerJobListEl.innerHTML = myJobs.length === 0 ? "<p>No jobs posted yet.</p>" : "";
    myJobs.forEach(job => {
        const applicantCount = applications.filter(a => a.jobId === job.id).length;
        const statusClass = job.status === "Approved" ? "badge-verified" : job.status === "Rejected" ? "badge-danger" : "badge-pending";
        employerJobListEl.innerHTML += `
            <div class="job-card dashboard-job">
                <div>
                    <h3>${esc(job.title)} <span class="${statusClass}">${esc(job.status)}</span></h3>
                    <p>${esc(job.location)} • ${esc(job.type)} • ${applicantCount} applicant(s)</p>
                </div>
                <a href="job-details.html?id=${job.id}" class="small-btn">View</a>
            </div>
        `;
    });

    const applicantListEl = document.getElementById("employerApplicantList");
    if (myApplications.length === 0) {
        applicantListEl.innerHTML = "<p>No applicants yet.</p>";
    } else {
        const students = getStudents();
        const statuses = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];
        applicantListEl.innerHTML = "";
        myApplications.slice().reverse().forEach(app => {
            const student = students.find(s => s.email === app.studentEmail);
            const job = myJobs.find(j => j.id === app.jobId);
            const match = student && job ? computeSmartMatch(student, job) : null;
            applicantListEl.innerHTML += `
                <div class="job-card dashboard-job applicant-row">
                    <div>
                        <h3>${student ? esc(student.name) : esc(app.studentEmail)}
                            ${student && student.verified ? '<span class="badge-verified">✔ Verified</span>' : ""}
                            ${match ? `<span class="badge-verified">${match.score}% match</span>` : ""}</h3>
                        <p>Applied to: ${job ? esc(job.title) : "Unknown job"}${app.interviewAt ? " • Interview: " + esc(app.interviewAt) : ""}</p>
                        ${student ? `<p>${esc(student.university)} • Skills: ${(student.skills || []).map(esc).join(", ") || "Not set"}</p>` : ""}
                    </div>
                    <select class="status-select" data-job="${app.jobId}" data-student="${esc(app.studentEmail)}" onchange="employerUpdateStatus(this)">
                        ${statuses.map(s => `<option value="${s}" ${s === app.status ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                </div>
            `;
        });
    }
}

function employerUpdateStatus(selectEl) {
    const jobId = parseInt(selectEl.dataset.job);
    const studentEmail = selectEl.dataset.student;
    const newStatus = selectEl.value;

    const applications = getApplications();
    const index = applications.findIndex(a => a.jobId === jobId && a.studentEmail === studentEmail);
    if (index === -1) return;

    applications[index].status = newStatus;

    if (newStatus === "Interview") {
        const when = prompt("Enter interview date & time (e.g. 12 Nov, 3:00 PM):", applications[index].interviewAt || "");
        applications[index].interviewAt = when || applications[index].interviewAt || "";
    }

    saveApplications(applications);

    const job = getJobs().find(j => j.id === jobId);
    const jobTitle = job ? job.title : "the job";

    const notifMessages = {
        Shortlisted: `🎯 You have been shortlisted for "${jobTitle}".`,
        Interview: `📅 Interview for "${jobTitle}": ${applications[index].interviewAt || "date to be confirmed"}.`,
        Selected: `🎉 Congratulations! You have been selected for "${jobTitle}".`,
        Rejected: `Your application for "${jobTitle}" was not selected this time.`
    };
    if (notifMessages[newStatus]) addNotification(studentEmail, notifMessages[newStatus]);

    if (newStatus === "Shortlisted") {
        sendSimulatedSMS(`Hi, your application for "${jobTitle}" has been shortlisted. Stay tuned!`);
    } else if (newStatus === "Interview") {
        sendSimulatedSMS(`Hi, you have an interview for "${jobTitle}" on ${applications[index].interviewAt || "the scheduled time"}.`);
    } else if (newStatus === "Selected") {
        sendSimulatedSMS(`Congratulations! You have been selected for "${jobTitle}".`);
    } else if (newStatus === "Rejected") {
        sendSimulatedSMS(`Hi, thank you for applying to "${jobTitle}". Unfortunately you were not selected this time.`);
    }

    renderEmployerDashboard(getCurrentUser());
}

// =====================================================
// POST JOB (employer)
// =====================================================

const postJobForm = document.getElementById("postJobForm");
if (postJobForm) {
    const user = getCurrentUser();
    if (!user || user.role !== "employer") {
        window.location.href = "employer-login.html";
    } else {
        createChipPicker("jobSkillPicker", SKILL_CATALOG, [], { allowCustom: true });

        postJobForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const msg = document.getElementById("postJobMessage");
            const picker = chipPickers["jobSkillPicker"];
            const skills = picker ? picker.getSelected() : [];

            if (skills.length === 0) {
                if (msg) {
                    msg.textContent = "Please select at least one required skill.";
                    msg.classList.add("is-error");
                }
                return;
            }
            if (msg) msg.classList.remove("is-error");

            const employer = getEmployers().find(e => e.email === user.email);
            const jobs = getJobs();
            const workingDays = Array.from(document.querySelectorAll("#workingDaysBox input:checked")).map(cb => cb.value);

            jobs.push({
                id: nextJobId(),
                title: document.getElementById("jobTitleInput").value.trim(),
                company: employer ? employer.companyName : "Unknown Company",
                location: document.getElementById("jobLocationInput").value,
                type: document.getElementById("jobTypeInput").value,
                salary: document.getElementById("jobSalaryInput").value.trim(),
                skills: skills,
                experienceRequired: document.getElementById("jobExperienceInput").value.trim(),
                workingDays: workingDays,
                hoursStart: document.getElementById("jobHoursStart").value,
                hoursEnd: document.getElementById("jobHoursEnd").value,
                description: document.getElementById("jobDescriptionInput").value.trim(),
                postedBy: user.email,
                status: "Pending"
            });

            saveJobs(jobs);
            const newJob = jobs[jobs.length - 1];
            addNotification(ADMIN_EMAIL, `🆕 New job "${newJob.title}" from ${newJob.company} is waiting for approval.`);

            if (msg) msg.textContent = "Job submitted! It will appear to students once Admin approves it.";
            postJobForm.reset();
            createChipPicker("jobSkillPicker", SKILL_CATALOG, [], { allowCustom: true });
        });
    }
}

// =====================================================
// ADMIN DASHBOARD
// =====================================================

const adminJobList = document.getElementById("adminJobList");
if (adminJobList) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        window.location.href = "admin-login.html";
    } else {
        renderAdminDashboard();
    }
}

function renderAdminDashboard() {
    const students = getStudents();
    const employers = getEmployers();
    const jobs = getJobs();
    const applications = getApplications();
    const pendingJobs = jobs.filter(j => j.status === "Pending");

    document.getElementById("totalStudents").textContent = students.length;
    document.getElementById("totalEmployers").textContent = employers.length;
    document.getElementById("totalJobs").textContent = jobs.length;
    document.getElementById("pendingJobsCount").textContent = pendingJobs.length;
    document.getElementById("totalApps").textContent = applications.length;
    renderAdminCharts(students, jobs, applications);

    const pendingListEl = document.getElementById("pendingJobList");
    pendingListEl.innerHTML = pendingJobs.length === 0 ? "<p>No jobs waiting for approval.</p>" : "";
    pendingJobs.forEach(job => {
        pendingListEl.innerHTML += `
            <div class="admin-row">
                <div>
                    <h3>${esc(job.title)}</h3>
                    <p>${esc(job.company)} • ${esc(job.location)} • Posted by ${esc(job.postedBy)}</p>
                </div>
                <div class="admin-row-actions">
                    <button class="small-btn" onclick="adminSetJobStatus(${job.id}, 'Approved')">Approve</button>
                    <button class="small-btn danger-btn" onclick="adminSetJobStatus(${job.id}, 'Rejected')">Reject</button>
                </div>
            </div>
        `;
    });

    const adminJobListEl = document.getElementById("adminJobList");
    adminJobListEl.innerHTML = jobs.length === 0 ? "<p>No jobs posted yet.</p>" : "";
    jobs.forEach(job => {
        const applicantCount = applications.filter(a => a.jobId === job.id).length;
        const statusClass = job.status === "Approved" ? "badge-verified" : job.status === "Rejected" ? "badge-danger" : "badge-pending";
        adminJobListEl.innerHTML += `
            <div class="admin-row">
                <div>
                    <h3>${esc(job.title)} <span class="${statusClass}">${esc(job.status)}</span></h3>
                    <p>${esc(job.company)} • ${esc(job.location)} • ${applicantCount} applicant(s) • Posted by ${esc(job.postedBy)}</p>
                </div>
                <button class="small-btn danger-btn" onclick="adminDeleteJob(${job.id})">Remove</button>
            </div>
        `;
    });

    const studentListEl = document.getElementById("adminStudentList");
    studentListEl.innerHTML = students.length === 0 ? "<p>No students registered yet.</p>" : "";
    students.forEach(s => {
        studentListEl.innerHTML += `
            <div class="admin-row">
                <div>
                    <h3>${esc(s.name)} ${s.verified ? '<span class="badge-verified">✔ Verified</span>' : '<span class="badge-pending">Unverified</span>'}</h3>
                    <p>${esc(s.email)} • ${esc(s.university)} • Skills: ${(s.skills || []).map(esc).join(", ") || "Not set"}</p>
                </div>
                <button class="small-btn" data-role="student" data-email="${esc(s.email)}" onclick="adminToggleVerify(this.dataset.role, this.dataset.email)">${s.verified ? "Unverify" : "Verify"}</button>
            </div>
        `;
    });

    const employerListEl = document.getElementById("adminEmployerList");
    employerListEl.innerHTML = employers.length === 0 ? "<p>No employers registered yet.</p>" : "";
    employers.forEach(e => {
        const postedCount = jobs.filter(j => j.postedBy === e.email).length;
        employerListEl.innerHTML += `
            <div class="admin-row">
                <div>
                    <h3>${esc(e.companyName)} ${e.verified ? '<span class="badge-verified">✔ Verified</span>' : '<span class="badge-pending">Unverified</span>'}</h3>
                    <p>${esc(e.email)} • ${esc(e.industry)} • ${postedCount} job(s) posted</p>
                </div>
                <button class="small-btn" data-role="employer" data-email="${esc(e.email)}" onclick="adminToggleVerify(this.dataset.role, this.dataset.email)">${e.verified ? "Unverify" : "Verify"}</button>
            </div>
        `;
    });
}

function adminSetJobStatus(jobId, status) {
    const jobs = getJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) return;
    jobs[index].status = status;
    saveJobs(jobs);
    addNotification(jobs[index].postedBy,
        status === "Approved" ? `✅ Your job "${jobs[index].title}" was approved and is now visible to students.`
                              : `❌ Your job "${jobs[index].title}" was rejected by the admin.`);
    renderAdminDashboard();
}

function adminDeleteJob(jobId) {
    if (!confirm("Remove this job posting?")) return;
    saveJobs(getJobs().filter(j => j.id !== jobId));
    renderAdminDashboard();
}

function adminToggleVerify(role, email) {
    if (role === "student") {
        const students = getStudents();
        const index = students.findIndex(s => s.email === email);
        if (index === -1) return;
        students[index].verified = !students[index].verified;
        saveStudents(students);
        if (students[index].verified) addNotification(email, "✅ Your account has been verified by the admin.");
    } else {
        const employers = getEmployers();
        const index = employers.findIndex(e => e.email === email);
        if (index === -1) return;
        employers[index].verified = !employers[index].verified;
        saveEmployers(employers);
        if (employers[index].verified) addNotification(email, "✅ Your company has been verified by the admin.");
    }
    renderAdminDashboard();
}

// =====================================================
// NAVBAR: highlight the current page link
// =====================================================

(function markActiveNav() {
    const norm = p => (p || "").split("#")[0].split("?")[0].replace(/\.html$/, "").replace(/^\//, "") || "index";
    const current = norm(window.location.pathname.split("/").pop());
    document.querySelectorAll(".nav-links a").forEach(a => {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("#")) return;
        if (norm(href.split("/").pop()) === current) a.classList.add("active");
    });
})();


// =====================================================
// NOTIFICATION BELL (injected into the navbar when logged in)
// =====================================================

(function setupNotificationBell() {
    const user = getCurrentUser();
    const navbar = document.querySelector(".navbar");
    if (!user || !navbar) return;
    const to = user.email;

    const wrap = document.createElement("div");
    wrap.className = "notif-wrap no-print";
    wrap.innerHTML = `
        <button type="button" class="notif-btn" aria-label="Notifications">🔔<span class="notif-badge" hidden></span></button>
        <div class="notif-panel"></div>
    `;

    const right = navbar.querySelector(".logout-btn, .nav-buttons");
    const group = document.createElement("div");
    group.className = "nav-right";
    if (right) {
        right.parentNode.insertBefore(group, right);
        group.appendChild(wrap);
        group.appendChild(right);
    } else {
        navbar.appendChild(group);
        group.appendChild(wrap);
    }

    const btn = wrap.querySelector(".notif-btn");
    const badge = wrap.querySelector(".notif-badge");
    const panel = wrap.querySelector(".notif-panel");

    const mine = () => getNotifications()
        .filter(n => n.to === to)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    function updateBadge() {
        const unread = mine().filter(n => !n.read).length;
        badge.hidden = unread === 0;
        badge.textContent = unread > 9 ? "9+" : String(unread);
    }

    function renderPanel() {
        const items = mine().slice(0, 10);
        panel.innerHTML = `
            <div class="notif-head"><span>Notifications</span><button type="button" class="notif-clear">Clear all</button></div>
            ${items.length
                ? items.map(n => `<div class="notif-item${n.read ? "" : " unread"}">${esc(n.message)}<span class="notif-time">${esc(timeAgo(n.createdAt))}</span></div>`).join("")
                : `<div class="notif-empty">No notifications yet.</div>`}
        `;
    }

    function markAllRead() {
        const all = getNotifications();
        all.forEach(n => { if (n.to === to) n.read = true; });
        saveNotifications(all);
    }

    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const open = panel.classList.toggle("open");
        if (open) {
            renderPanel();
            markAllRead();
            updateBadge();
        }
    });

    panel.addEventListener("click", function (e) {
        e.stopPropagation();
        if (e.target.classList.contains("notif-clear")) {
            saveNotifications(getNotifications().filter(n => n.to !== to));
            renderPanel();
            updateBadge();
        }
    });

    document.addEventListener("click", () => panel.classList.remove("open"));
    window.addEventListener("storage", updateBadge);
    updateBadge();
})();
