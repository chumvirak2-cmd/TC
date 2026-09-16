import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const STORAGE_KEY = 'ai-admin-hr-system-v1';
const USERS_STORAGE_KEY = 'ai-admin-hr-users-v1';

const defaultData = {
  employees: [
    { id: 1, name: 'Sokha Lim', role: 'HR Manager', team: 'People Ops', status: 'Present', score: 94 },
    { id: 2, name: 'Dara Nop', role: 'Operations Lead', team: 'Operations', status: 'Remote', score: 91 },
    { id: 3, name: 'Mali Chhun', role: 'Recruitment Specialist', team: 'Talent', status: 'Present', score: 89 },
    { id: 4, name: 'Phalla Voeurn', role: 'Payroll Officer', team: 'Finance', status: 'On Leave', score: 86 },
  ],
  tasks: [
    { id: 1, title: 'Review payroll approvals', owner: 'Finance', time: '09:00', priority: 'High' },
    { id: 2, title: 'Interview final candidates', owner: 'Talent', time: '11:30', priority: 'Medium' },
    { id: 3, title: 'Policy update review', owner: 'Compliance', time: '14:00', priority: 'High' },
    { id: 4, title: 'Team onboarding checklist', owner: 'HR', time: '15:30', priority: 'Low' },
  ],
  recruitment: [
    { stage: 'Applications', count: 128, tone: 'orange' },
    { stage: 'Screening', count: 42, tone: 'green' },
    { stage: 'Interviews', count: 14, tone: 'blue' },
    { stage: 'Offer', count: 6, tone: 'purple' },
  ],
  performance: [
    { label: 'Attendance', value: 96 },
    { label: 'Engagement', value: 88 },
    { label: 'Productivity', value: 92 },
    { label: 'Satisfaction', value: 90 },
  ],
  aiSuggestions: [
    'Prepare a hiring summary for this week',
    'Draft a leave policy reminder for managers',
    'Generate a payroll compliance checklist',
    'Summarize employee engagement trends',
  ],
  leaves: [
    { id: 1, employee: 'Sokha Lim', type: 'Annual', days: 2, date: '2026-09-18', status: 'Pending' },
    { id: 2, employee: 'Phalla Voeurn', type: 'Sick', days: 1, date: '2026-09-20', status: 'Approved' },
    { id: 3, employee: 'Mali Chhun', type: 'Personal', days: 3, date: '2026-09-25', status: 'Pending' },
  ],
  payroll: [
    { id: 1, name: 'Sokha Lim', role: 'HR Manager', base: 3200, bonus: 350, total: 3550, status: 'Paid' },
    { id: 2, name: 'Dara Nop', role: 'Operations Lead', base: 3600, bonus: 420, total: 4020, status: 'Pending' },
    { id: 3, name: 'Mali Chhun', role: 'Recruitment Specialist', base: 2900, bonus: 260, total: 3160, status: 'Paid' },
    { id: 4, name: 'Phalla Voeurn', role: 'Payroll Officer', base: 3000, bonus: 180, total: 3180, status: 'Pending' },
  ],
  attendance: [
    { employee: 'Sokha Lim', mon: 'Present', tue: 'Present', wed: 'Late', thu: 'Present', fri: 'Present' },
    { employee: 'Dara Nop', mon: 'Present', tue: 'Remote', wed: 'Present', thu: 'Present', fri: 'Remote' },
    { employee: 'Mali Chhun', mon: 'Present', tue: 'Present', wed: 'Present', thu: 'Absent', fri: 'Present' },
    { employee: 'Phalla Voeurn', mon: 'Leave', tue: 'Present', wed: 'Present', thu: 'Leave', fri: 'Present' },
  ],
};

const navItems = ['Dashboard', 'Employees', 'Leave', 'Payroll', 'Attendance', 'Recruitment', 'Tasks', 'AI'];

const defaultUsers = {
  admin: 'admin123',
  hr: 'hr123',
};

function readSavedData() {
  if (typeof window === 'undefined') return null;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Unable to read saved data', error);
    return null;
  }
}

function readSavedUsers() {
  if (typeof window === 'undefined') return defaultUsers;

  try {
    const saved = window.localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? { ...defaultUsers, ...JSON.parse(saved) } : defaultUsers;
  } catch (error) {
    console.warn('Unable to read saved users', error);
    return defaultUsers;
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeData(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const merged = {
    ...defaultData,
    ...value,
    employees: Array.isArray(value.employees) ? value.employees : defaultData.employees,
    tasks: Array.isArray(value.tasks) ? value.tasks : defaultData.tasks,
    recruitment: Array.isArray(value.recruitment) ? value.recruitment : defaultData.recruitment,
    performance: Array.isArray(value.performance) ? value.performance : defaultData.performance,
    aiSuggestions: Array.isArray(value.aiSuggestions) ? value.aiSuggestions : defaultData.aiSuggestions,
    leaves: Array.isArray(value.leaves) ? value.leaves : defaultData.leaves,
    payroll: Array.isArray(value.payroll) ? value.payroll : defaultData.payroll,
    attendance: Array.isArray(value.attendance) ? value.attendance : defaultData.attendance,
  };

  return merged;
}

export default function App() {
  const fileInputRef = useRef(null);
  const [data, setData] = useState(() => normalizeData(readSavedData()) || defaultData);
  const [view, setView] = useState('Dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState(() => readSavedUsers());
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [loginError, setLoginError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiDocument, setAiDocument] = useState('');
  const [aiProposalRows, setAiProposalRows] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    { id: 1, role: 'assistant', text: 'Hello. I can create tasks, open HR modules, or help investigate an operations issue.' },
  ]);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    team: '',
    status: 'Present',
    score: 88,
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    owner: '',
    time: '09:00',
    priority: 'Medium',
  });

  const [leaveForm, setLeaveForm] = useState({
    employee: 'Sokha Lim',
    type: 'Annual',
    days: 1,
    date: '2026-09-22',
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [qrEmployeeId, setQrEmployeeId] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [phoneCheckinId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('checkin') || '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    const employee = data.employees.find((item) => String(item.id) === String(qrEmployeeId));
    if (!employee || typeof window === 'undefined') {
      setQrImage('');
      return;
    }

    const checkInUrl = `${window.location.origin}${window.location.pathname}?checkin=${encodeURIComponent(employee.id)}`;
    QRCode.toDataURL(checkInUrl, { width: 220, margin: 2 })
      .then(setQrImage)
      .catch(() => setQrImage(''));
  }, [data.employees, qrEmployeeId]);

  const stats = useMemo(() => ({
    totalStaff: data.employees.length,
    openRoles: data.recruitment[0]?.count || 0,
    attendance: data.performance[0]?.value || 0,
    payroll: data.payroll.reduce((sum, item) => sum + item.total, 0),
    pendingLeaves: data.leaves.filter((item) => item.status === 'Pending').length,
  }), [data]);

  const handleLogin = (event) => {
    event.preventDefault();

    const validPassword = users[loginForm.username.trim().toLowerCase()];
    if (validPassword && validPassword === loginForm.password) {
      setIsAuthenticated(true);
      setLoginError('');
      return;
    }

    setLoginError('Invalid username or password');
  };

  const handleSignup = (event) => {
    event.preventDefault();
    const username = signupForm.username.trim().toLowerCase();

    if (username.length < 3 || signupForm.password.length < 6) {
      setLoginError('Username needs 3+ characters and password needs 6+ characters');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setLoginError('Passwords do not match');
      return;
    }

    if (users[username]) {
      setLoginError('That username is already registered');
      return;
    }

    const nextUsers = { ...users, [username]: signupForm.password };
    setUsers(nextUsers);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
    setLoginForm({ username, password: signupForm.password });
    setSignupForm({ username: '', password: '', confirmPassword: '' });
    setAuthMode('login');
    setLoginError('Account created. You can now sign in.');
  };

  const handleEmployeeSubmit = (event) => {
    event.preventDefault();

    if (!employeeForm.name.trim() || !employeeForm.role.trim() || !employeeForm.team.trim()) {
      return;
    }

    const employee = {
      id: editingEmployeeId || makeId('employee'),
      name: employeeForm.name.trim(),
      role: employeeForm.role.trim(),
      team: employeeForm.team.trim(),
      status: employeeForm.status,
      score: Number(employeeForm.score) || 0,
    };

    setData((current) => ({
      ...current,
      employees: editingEmployeeId
        ? current.employees.map((item) => (item.id === editingEmployeeId ? employee : item))
        : [...current.employees, employee],
    }));

    setEmployeeForm({ name: '', role: '', team: '', status: 'Present', score: 88 });
    setEditingEmployeeId(null);
  };

  const handleTaskSubmit = (event) => {
    event.preventDefault();

    if (!taskForm.title.trim() || !taskForm.owner.trim()) {
      return;
    }

    const task = {
      id: editingTaskId || makeId('task'),
      title: taskForm.title.trim(),
      owner: taskForm.owner.trim(),
      time: taskForm.time,
      priority: taskForm.priority,
    };

    setData((current) => ({
      ...current,
      tasks: editingTaskId
        ? current.tasks.map((item) => (item.id === editingTaskId ? task : item))
        : [...current.tasks, task],
    }));

    setTaskForm({ title: '', owner: '', time: '09:00', priority: 'Medium' });
    setEditingTaskId(null);
  };

  const handleLeaveSubmit = (event) => {
    event.preventDefault();

    setData((current) => ({
      ...current,
      leaves: [
        { id: makeId('leave'), employee: leaveForm.employee, type: leaveForm.type, days: Number(leaveForm.days), date: leaveForm.date, status: 'Pending' },
        ...current.leaves,
      ],
    }));

    setLeaveForm({ employee: 'Sokha Lim', type: 'Annual', days: 1, date: '2026-09-22' });
  };

  const handleRecruitmentChange = (stage, value) => {
    setData((current) => ({
      ...current,
      recruitment: current.recruitment.map((item) =>
        item.stage === stage ? { ...item, count: Number(value) || 0 } : item,
      ),
    }));
  };

  const handleDeleteEmployee = (id) => {
    setData((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== id),
    }));
  };

  const handleDeleteTask = (id) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== id),
    }));
  };

  const handleLeaveDecision = (id, status) => {
    setData((current) => ({
      ...current,
      leaves: current.leaves.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
  };

  const handleAttendanceChange = (employee, day, value) => {
    setData((current) => ({
      ...current,
      attendance: current.attendance.map((item) =>
        item.employee === employee ? { ...item, [day]: value } : item,
      ),
    }));
  };

  const handleEmployeeStatus = (employeeName, status) => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((item) => (item.name === employeeName ? { ...item, status } : item)),
      attendance: current.attendance.map((item) => (item.employee === employeeName ? { ...item, today: status } : item)),
    }));
    setStatusMessage(`${employeeName} marked ${status}`);
  };

  const renderPhoneCheckin = () => {
    const employee = data.employees.find((item) => String(item.id) === String(phoneCheckinId));
    if (!employee) return null;

    return (
      <div className="phone-checkin-shell">
        <div className="phone-checkin-box">
          <div className="brand-mark large">SB</div>
          <div className="eyebrow">Smart Biz attendance</div>
          <h1>Good morning, {employee.name}</h1>
          <p>Choose your attendance status for today.</p>
          <div className="phone-status-grid">
            {['Present', 'Absent', 'Remote'].map((status) => (
              <button key={status} type="button" className={`phone-status-button ${status.toLowerCase()} ${employee.status === status ? 'selected' : ''}`} onClick={() => handleEmployeeStatus(employee.name, status)}>
                {status}
              </button>
            ))}
          </div>
          <div className="phone-checkin-note">Current status: <strong>{employee.status}</strong></div>
          <div className="demo-note">You can close this page after submitting.</div>
        </div>
      </div>
    );
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStatusMessage('Data saved locally');
    }
  };

  const handleLoad = () => {
    const saved = readSavedData();
    if (saved) {
      const restored = normalizeData(saved);
      setData(restored || defaultData);
      setStatusMessage('Data restored from local storage');
      return;
    }

    setStatusMessage('No saved data found');
  };

  const handleExport = () => {
    if (typeof window === 'undefined') return;

    const workbook = XLSX.utils.book_new();
    const sheets = [
      ['Employees', data.employees],
      ['Leave', data.leaves],
      ['Payroll', data.payroll],
      ['Attendance', data.attendance],
      ['Tasks', data.tasks],
      ['Recruitment', data.recruitment],
    ];

    sheets.forEach(([name, rows]) => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    });

    XLSX.writeFile(workbook, 'ai-admin-hr-report.xlsx');
    setStatusMessage('Excel report downloaded');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const restored = normalizeData(parsed);

      if (!restored) {
        throw new Error('Invalid backup');
      }

      setData(restored);
      setView('Dashboard');
      setStatusMessage('Backup imported successfully');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      }
    } catch (error) {
      console.error('Failed to import backup', error);
      setStatusMessage('Import failed. Use a valid JSON backup.');
    } finally {
      event.target.value = '';
    }
  };

  const handleReset = () => {
    setData(defaultData);
    setStatusMessage('Data reset to default');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setAiInput(suggestion);
    setView('AI');
  };

  const makeProposalTemplate = (request) => {
    const topic = request
      .replace(/^(please\s+)?(create|write|draft|make)\s+(a\s+)?/i, '')
      .replace(/proposal\s+(template|draft)?\s*(for|about)?\s*/i, '')
      .trim() || 'Smart Biz Management Workflow';

    const rows = [
      ['Proposal Template', topic],
      ['Prepared for', '[Client or Department]'],
      ['Prepared by', 'Smart Biz Management Workflow'],
      ['Date', new Date().toLocaleDateString()],
      ['Executive Summary', `This proposal outlines a practical solution for ${topic}. The goal is to improve operational visibility, reduce manual work, and give decision-makers reliable information in one place.`],
      ['Current Challenge', 'The organization needs a clearer way to manage this area, coordinate responsible teams, and track progress from request to completion.'],
      ['Proposed Solution', 'We will assess the current workflow, configure the required process, assign ownership, and provide a simple reporting view.'],
      ['Success Measures', 'Adoption, turnaround time, data accuracy, and stakeholder satisfaction.'],
      ['Estimated Investment', '[Amount]'],
      ['Payment Terms', '[Terms]'],
      ['Approval', 'Approved by: ____________________  Signature: ____________________  Date: ____________________'],
    ];

    const scopeRows = [
      ['Order', 'Scope of Work', 'Owner', 'Status'],
      [1, 'Confirm requirements and success measures', '[Owner]', 'Not started'],
      [2, 'Configure the workflow and responsibilities', '[Owner]', 'Not started'],
      [3, 'Prepare templates, reports, and approval steps', '[Owner]', 'Not started'],
      [4, 'Test the process with stakeholders', '[Owner]', 'Not started'],
      [5, 'Provide handover guidance and support', '[Owner]', 'Not started'],
    ];

    const timelineRows = [
      ['Phase', 'Activity', 'Target Date', 'Status'],
      ['Phase 1', 'Discovery and requirements', '[Date]', 'Not started'],
      ['Phase 2', 'Configuration and review', '[Date]', 'Not started'],
      ['Phase 3', 'Launch and handover', '[Date]', 'Not started'],
    ];

    return {
      text: `PROPOSAL: ${topic.toUpperCase()}\n\nPrepared for: [Client or Department]\nPrepared by: Smart Biz Management Workflow\nDate: ${new Date().toLocaleDateString()}\n\n1. Executive Summary\n${rows[4][1]}\n\n2. Current Challenge\n${rows[5][1]}\n\n3. Proposed Solution\n${rows[6][1]}\n\n4. Scope of Work\n- Confirm requirements and success measures\n- Configure the workflow and responsibilities\n- Prepare templates, reports, and approval steps\n- Test the process with stakeholders\n- Provide handover guidance and support\n\n5. Deliverables\n- Approved workflow and operating checklist\n- Working management dashboard\n- Staff or stakeholder communication template\n- Summary report with recommended next actions\n\n6. Timeline\nPhase 1: Discovery and requirements - [Date]\nPhase 2: Configuration and review - [Date]\nPhase 3: Launch and handover - [Date]\n\n7. Investment\nEstimated investment: [Amount]\nPayment terms: [Terms]\n\n8. Success Measures\n${rows[7][1]}\n\n9. Approval\n${rows[10][1]}`,
      rows,
      scopeRows,
      timelineRows,
    };
  };

  const handleCopyDocument = async () => {
    if (!aiDocument || typeof navigator === 'undefined') return;
    await navigator.clipboard.writeText(aiDocument);
    setStatusMessage('AI document copied to clipboard');
  };

  const handleDownloadDocument = () => {
    if (!aiProposalRows || typeof window === 'undefined') return;
    const workbook = XLSX.utils.book_new();
    const proposalSheet = XLSX.utils.aoa_to_sheet(aiProposalRows.rows);
    const scopeSheet = XLSX.utils.aoa_to_sheet(aiProposalRows.scopeRows);
    const timelineSheet = XLSX.utils.aoa_to_sheet(aiProposalRows.timelineRows);
    XLSX.utils.book_append_sheet(workbook, proposalSheet, 'Proposal');
    XLSX.utils.book_append_sheet(workbook, scopeSheet, 'Scope of Work');
    XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline');
    XLSX.writeFile(workbook, 'ai-proposal-template.xlsx');
    setStatusMessage('Proposal Excel template downloaded');
  };

  const handleAiSubmit = (event) => {
    event.preventDefault();
    const request = aiInput.trim();
    if (!request) return;

    const lowerRequest = request.toLowerCase();
    let response = 'I can help with that. Try asking me to create a task, review leave, check payroll, or open the employee directory.';

    if (lowerRequest.includes('proposal') || lowerRequest.includes('template') || lowerRequest.includes('letter') || lowerRequest.includes('policy')) {
      const proposal = makeProposalTemplate(request);
      setAiDocument(proposal.text);
      setAiProposalRows(proposal);
      response = 'Done. I created an editable proposal template and an Excel workbook with Proposal, Scope of Work, and Timeline sheets.';
    } else if (lowerRequest.includes('task') || lowerRequest.includes('todo') || lowerRequest.includes('create')) {
      const title = request.replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(task|todo)\s*(to|for)?\s*/i, '').trim() || 'Follow up on AI request';
      setData((current) => ({
        ...current,
        tasks: [...current.tasks, { id: makeId('task'), title, owner: 'AI Assistant', time: '09:00', priority: 'Medium' }],
      }));
      response = `Done. I created the task "${title}" and added it to the Task Queue.`;
    } else if (lowerRequest.includes('leave') || lowerRequest.includes('vacation')) {
      setView('Leave');
      response = 'I opened Leave Management so you can submit or approve a request.';
    } else if (lowerRequest.includes('payroll') || lowerRequest.includes('salary')) {
      setView('Payroll');
      response = 'I opened Payroll so you can review the current pay cycle.';
    } else if (lowerRequest.includes('employee') || lowerRequest.includes('staff')) {
      setView('Employees');
      response = 'I opened the Employee Directory for you.';
    } else if (lowerRequest.includes('attendance')) {
      setView('Attendance');
      response = 'I opened Attendance Tracker so you can inspect or update records.';
    } else if (lowerRequest.includes('issue') || lowerRequest.includes('problem') || lowerRequest.includes('help')) {
      response = 'I can help isolate the issue. Tell me which area is affected, what you expected, and what happened instead.';
    }

    setAiMessages((current) => [
      ...current,
      { id: makeId('message'), role: 'user', text: request },
      { id: makeId('message'), role: 'assistant', text: response },
    ]);
    setAiInput('');
  };

  const renderDashboard = () => (
    <>
      <section className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-head">
            <span>Total Staff</span>
            <span className="trend up">+8.2%</span>
          </div>
          <div className="stat-number">{stats.totalStaff}</div>
          <div className="stat-foot">Across all departments</div>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>Open Roles</span>
            <span className="trend down">-3</span>
          </div>
          <div className="stat-number">{stats.openRoles}</div>
          <div className="stat-foot">Applications in pipeline</div>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>Attendance</span>
            <span className="trend up">+2.1%</span>
          </div>
          <div className="stat-number">{stats.attendance}%</div>
          <div className="stat-foot">This month</div>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <span>Payroll</span>
            <span className="trend up">+5.7%</span>
          </div>
          <div className="stat-number">${(stats.payroll / 1000).toFixed(1)}k</div>
          <div className="stat-foot">Estimated active cycle</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Workforce Overview</h2>
            <button className="tiny-btn">This Month</button>
          </div>

          <div className="bars-panel">
            {data.performance.map((item) => (
              <div className="bar-row" key={item.label}>
                <div className="bar-label">{item.label}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${item.value}%` }} />
                </div>
                <div className="bar-value">{item.value}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Recruitment Funnel</h2>
            <span className="badge success">Live</span>
          </div>

          <div className="funnel-grid">
            {data.recruitment.map((item) => (
              <div key={item.stage} className={`funnel-card ${item.tone}`}>
                <div className="funnel-stage">{item.stage}</div>
                <div className="funnel-count">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Team Members</h2>
            <button className="tiny-btn" onClick={() => setView('Employees')}>View All</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.role}</td>
                  <td>{person.team}</td>
                  <td>
                    <span className={`status-chip ${person.status === 'Present' ? 'green' : person.status === 'Remote' ? 'blue' : 'amber'}`}>
                      {person.status}
                    </span>
                  </td>
                  <td>{person.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stacked-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Pending Leave</h2>
              <span className="badge neutral">{stats.pendingLeaves}</span>
            </div>

            <div className="task-list">
              {data.leaves.slice(0, 3).map((item) => (
                <div className="task-item" key={item.id}>
                  <div>
                    <div className="task-title">{item.employee}</div>
                    <div className="task-meta">{item.type} • {item.days} days</div>
                  </div>
                  <span className={`priority ${item.status === 'Approved' ? 'low' : item.status === 'Pending' ? 'medium' : 'high'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>AI Assistant</h2>
              <span className="badge success">Online</span>
            </div>

            <div className="suggestion-list">
              {data.aiSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" className="suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderEmployees = () => (
    <div className="workspace-panel">
      <div className="panel list-panel">
        <div className="panel-header">
          <h2>Employee Directory</h2>
          <button className="tiny-btn" onClick={() => setView('Dashboard')}>Back</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Team</th>
              <th>Status</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.role}</td>
                <td>{person.team}</td>
                <td>
                  <span className={`status-chip ${person.status === 'Present' ? 'green' : person.status === 'Remote' ? 'blue' : 'amber'}`}>
                    {person.status}
                  </span>
                </td>
                <td>{person.score}%</td>
                <td>
                  <div className="action-stack">
                    <button
                      className="small-btn"
                      onClick={() => {
                        setEmployeeForm({
                          name: person.name,
                          role: person.role,
                          team: person.team,
                          status: person.status,
                          score: person.score,
                        });
                        setEditingEmployeeId(person.id);
                      }}
                    >
                      Edit
                    </button>
                    <button className="small-btn danger" onClick={() => handleDeleteEmployee(person.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel form-panel">
        <div className="panel-header">
          <h2>{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</h2>
        </div>

        <form className="form-grid" onSubmit={handleEmployeeSubmit}>
          <label className="field-group">
            <span>Name</span>
            <input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Role</span>
            <input value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Team</span>
            <input value={employeeForm.team} onChange={(event) => setEmployeeForm({ ...employeeForm, team: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Status</span>
            <select value={employeeForm.status} onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })}>
              <option>Present</option>
              <option>Remote</option>
              <option>On Leave</option>
            </select>
          </label>

          <label className="field-group">
            <span>Performance Score</span>
            <input
              type="number"
              min="0"
              max="100"
              value={employeeForm.score}
              onChange={(event) => setEmployeeForm({ ...employeeForm, score: event.target.value })}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-btn">{editingEmployeeId ? 'Save Changes' : 'Add Employee'}</button>
            <button type="button" className="ghost-btn" onClick={() => {
              setEmployeeForm({ name: '', role: '', team: '', status: 'Present', score: 88 });
              setEditingEmployeeId(null);
            }}>Clear</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderLeave = () => (
    <div className="workspace-panel leave-panel">
      <div className="panel list-panel">
        <div className="panel-header">
          <h2>Leave Requests</h2>
          <button className="tiny-btn" onClick={() => setView('Dashboard')}>Back</button>
        </div>

        <div className="leave-list">
          {data.leaves.map((item) => (
            <div key={item.id} className="leave-item">
              <div>
                <div className="task-title">{item.employee}</div>
                <div className="task-meta">{item.type} • {item.days} days • {item.date}</div>
              </div>
              <div className="leave-actions">
                <span className={`priority ${item.status === 'Approved' ? 'low' : item.status === 'Pending' ? 'medium' : 'high'}`}>{item.status}</span>
                <button className="small-btn" onClick={() => handleLeaveDecision(item.id, 'Approved')}>Approve</button>
                <button className="small-btn danger" onClick={() => handleLeaveDecision(item.id, 'Rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel form-panel">
        <div className="panel-header">
          <h2>Submit Leave</h2>
        </div>

        <form className="form-grid" onSubmit={handleLeaveSubmit}>
          <label className="field-group">
            <span>Employee</span>
            <select value={leaveForm.employee} onChange={(event) => setLeaveForm({ ...leaveForm, employee: event.target.value })}>
              {data.employees.map((person) => (
                <option key={person.id}>{person.name}</option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Type</span>
            <select value={leaveForm.type} onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value })}>
              <option>Annual</option>
              <option>Sick</option>
              <option>Personal</option>
              <option>Parental</option>
            </select>
          </label>

          <label className="field-group">
            <span>Days</span>
            <input type="number" min="1" value={leaveForm.days} onChange={(event) => setLeaveForm({ ...leaveForm, days: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Start Date</span>
            <input type="date" value={leaveForm.date} onChange={(event) => setLeaveForm({ ...leaveForm, date: event.target.value })} />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-btn">Submit Leave</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="workspace-panel payroll-panel">
      <div className="panel full-width-panel">
        <div className="panel-header">
          <h2>Payroll Summary</h2>
        </div>

        <div className="payroll-grid">
          {data.payroll.map((entry) => (
            <div key={entry.id} className="payroll-card">
              <div className="payroll-header">
                <div>
                  <div className="task-title">{entry.name}</div>
                  <div className="task-meta">{entry.role}</div>
                </div>
                <span className={`status-chip ${entry.status === 'Paid' ? 'green' : 'amber'}`}>{entry.status}</span>
              </div>

              <div className="payroll-row">
                <span>Base</span>
                <strong>${entry.base}</strong>
              </div>
              <div className="payroll-row">
                <span>Bonus</span>
                <strong>${entry.bonus}</strong>
              </div>
              <div className="payroll-row total">
                <span>Total</span>
                <strong>${entry.total}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="workspace-panel attendance-workspace">
      <div className="panel full-width-panel">
        <div className="panel-header">
          <div>
            <h2>Attendance Tracker</h2>
            <div className="task-meta">Use the toggle to mark Present, Absent, or Remote.</div>
          </div>
          <span className="badge success">Today</span>
        </div>

        <div className="attendance-status-grid">
          {data.employees.map((person) => (
            <div className="attendance-person" key={person.id}>
              <div>
                <div className="task-title">{person.name}</div>
                <div className="task-meta">{person.role}</div>
              </div>
              <div className="attendance-toggle" role="group" aria-label={`Attendance status for ${person.name}`}>
                {['Present', 'Absent', 'Remote'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`status-toggle ${person.status === status ? 'selected' : ''} ${status.toLowerCase()}`}
                    onClick={() => handleEmployeeStatus(person.name, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button type="button" className="small-btn" onClick={() => setQrEmployeeId(person.id)}>Phone QR</button>
            </div>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
            </tr>
          </thead>
          <tbody>
            {data.attendance.map((person) => (
              <tr key={person.employee}>
                <td>{person.employee}</td>
                {['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => (
                  <td key={`${person.employee}-${day}`}>
                    <select value={person[day]} onChange={(event) => handleAttendanceChange(person.employee, day, event.target.value)}>
                      <option>Present</option>
                      <option>Remote</option>
                      <option>Late</option>
                      <option>Absent</option>
                      <option>Leave</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrEmployeeId && (
        <div className="panel qr-panel">
          <div className="panel-header">
            <div>
              <h2>Phone check-in</h2>
              <div className="task-meta">Scan this QR code with the employee phone.</div>
            </div>
            <button type="button" className="tiny-btn" onClick={() => setQrEmployeeId(null)}>Close</button>
          </div>
          {qrImage && <img className="attendance-qr" src={qrImage} alt="Employee phone check-in QR code" />}
          <div className="task-title">{data.employees.find((item) => item.id === qrEmployeeId)?.name}</div>
          <div className="task-meta">The phone check-in page offers the same Present, Absent, and Remote toggles.</div>
        </div>
      )}
    </div>
  );

  const renderTasks = () => (
    <div className="workspace-panel">
      <div className="panel list-panel">
        <div className="panel-header">
          <h2>Task Queue</h2>
          <button className="tiny-btn" onClick={() => setView('Dashboard')}>Back</button>
        </div>

        <div className="task-list full-list">
          {data.tasks.map((task) => (
            <div className="task-item" key={task.id}>
              <div>
                <div className="task-title">{task.title}</div>
                <div className="task-meta">{task.owner} • {task.time}</div>
              </div>
              <div className="task-right">
                <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                <div className="action-stack">
                  <button
                    className="small-btn"
                    onClick={() => {
                      setTaskForm({
                        title: task.title,
                        owner: task.owner,
                        time: task.time,
                        priority: task.priority,
                      });
                      setEditingTaskId(task.id);
                    }}
                  >
                    Edit
                  </button>
                  <button className="small-btn danger" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel form-panel">
        <div className="panel-header">
          <h2>{editingTaskId ? 'Edit Task' : 'Add Task'}</h2>
        </div>

        <form className="form-grid" onSubmit={handleTaskSubmit}>
          <label className="field-group">
            <span>Task</span>
            <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Owner</span>
            <input value={taskForm.owner} onChange={(event) => setTaskForm({ ...taskForm, owner: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Time</span>
            <input type="time" value={taskForm.time} onChange={(event) => setTaskForm({ ...taskForm, time: event.target.value })} />
          </label>

          <label className="field-group">
            <span>Priority</span>
            <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-btn">{editingTaskId ? 'Save Task' : 'Add Task'}</button>
            <button type="button" className="ghost-btn" onClick={() => {
              setTaskForm({ title: '', owner: '', time: '09:00', priority: 'Medium' });
              setEditingTaskId(null);
            }}>Clear</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderRecruitment = () => (
    <div className="workspace-panel recruitment-panel">
      <div className="panel">
        <div className="panel-header">
          <h2>Recruitment Pipeline</h2>
        </div>

        <div className="recruitment-list">
          {data.recruitment.map((item) => (
            <div className="recruitment-row" key={item.stage}>
              <div className="stage-name">{item.stage}</div>
              <input
                type="number"
                min="0"
                value={item.count}
                onChange={(event) => handleRecruitmentChange(item.stage, event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>AI Suggestions</h2>
        </div>

        <div className="suggestion-list">
          {data.aiSuggestions.map((suggestion) => (
            <button type="button" className="suggestion-item" key={suggestion} onClick={() => handleSuggestionClick(suggestion)}>{suggestion}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAi = () => (
    <div className="workspace-panel">
      <div className="panel">
        <div className="panel-header">
          <h2>Smart Biz AI Assistant</h2>
          <span className="badge success">Online</span>
        </div>

        <div className="ai-console">
          {aiMessages.map((message) => (
            <div className={`ai-message ${message.role}`} key={message.id}>{message.text}</div>
          ))}
        </div>

        <form className="ai-chat-form" onSubmit={handleAiSubmit}>
          <input
            value={aiInput}
            onChange={(event) => setAiInput(event.target.value)}
            placeholder="Ask AI to create a task or solve an issue..."
            aria-label="Message AI assistant"
          />
          <button type="submit" className="primary-btn">Send</button>
        </form>

        {aiDocument && (
          <div className="ai-document-panel">
            <div className="panel-header">
              <h3>Generated document</h3>
              <div className="document-actions">
                <button type="button" className="small-btn" onClick={handleCopyDocument}>Copy</button>
                <button type="button" className="small-btn" onClick={handleDownloadDocument}>Download Excel</button>
              </div>
            </div>
            <textarea value={aiDocument} onChange={(event) => setAiDocument(event.target.value)} aria-label="Generated AI document" />
          </div>
        )}
      </div>
    </div>
  );

  if (phoneCheckinId) {
    return renderPhoneCheckin() || (
      <div className="login-shell"><div className="login-box"><h1>Check-in link expired</h1><p>Ask your administrator for a new QR code.</p></div></div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-shell">
        <div className="login-box">
          <div className="brand-mark large">AI</div>
          <h1>Smart Biz Management Workflow</h1>
          <p>Sign in to manage employees, leave, payroll, and operations.</p>

          {authMode === 'login' ? (
            <form className="login-form" onSubmit={handleLogin}>
              <label className="field-group">
                <span>Username</span>
                <input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} placeholder="admin" />
              </label>

              <label className="field-group">
                <span>Password</span>
                <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="admin123" />
              </label>

              {loginError && <div className="login-error">{loginError}</div>}

              <button type="submit" className="primary-btn login-btn">Login</button>
              <button type="button" className="ghost-btn auth-switch" onClick={() => { setAuthMode('signup'); setLoginError(''); }}>Create an account</button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleSignup}>
              <label className="field-group">
                <span>Username</span>
                <input value={signupForm.username} onChange={(event) => setSignupForm({ ...signupForm, username: event.target.value })} placeholder="your-name" />
              </label>

              <label className="field-group">
                <span>Password</span>
                <input type="password" value={signupForm.password} onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })} placeholder="At least 6 characters" />
              </label>

              <label className="field-group">
                <span>Confirm Password</span>
                <input type="password" value={signupForm.confirmPassword} onChange={(event) => setSignupForm({ ...signupForm, confirmPassword: event.target.value })} placeholder="Repeat your password" />
              </label>

              {loginError && <div className="login-error">{loginError}</div>}

              <button type="submit" className="primary-btn login-btn">Create Account</button>
              <button type="button" className="ghost-btn auth-switch" onClick={() => { setAuthMode('login'); setLoginError(''); }}>Back to login</button>
            </form>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <div className="brand-name">Smart Biz</div>
            <div className="brand-subtitle">Management Workflow</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${view === item ? 'active' : ''}`}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mini-card">
          <div className="mini-label">AI Summary</div>
          <div className="mini-value">+18.4%</div>
          <div className="mini-note">Productivity uplift this month</div>
        </div>

        <button type="button" className="reset-btn" onClick={handleReset}>Reset Data</button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Operations Overview</div>
            <h1>Smart Biz Management Workflow</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" onClick={handleSave}>Save</button>
            <button className="ghost-btn" onClick={handleLoad}>Load</button>
            <button className="ghost-btn" onClick={handleExport}>Export</button>
            <button className="ghost-btn" onClick={() => fileInputRef.current?.click()}>Import</button>
            <button className="ghost-btn" onClick={() => setIsAuthenticated(false)}>Logout</button>
            <button className="primary-btn" onClick={() => setView('Employees')}>Add Employee</button>
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        {statusMessage && <div className="status-banner">{statusMessage}</div>}

        {view === 'Dashboard' && renderDashboard()}
        {view === 'Employees' && renderEmployees()}
        {view === 'Leave' && renderLeave()}
        {view === 'Payroll' && renderPayroll()}
        {view === 'Attendance' && renderAttendance()}
        {view === 'Recruitment' && renderRecruitment()}
        {view === 'Tasks' && renderTasks()}
        {view === 'AI' && renderAi()}
      </main>
    </div>
  );
}

