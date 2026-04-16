let token = localStorage.getItem("token");
let currentUser = null;

const tailConfig = () => {
  tailwind.config = { content: ["*"], theme: { extend: {} } };
};
tailConfig();

async function apiCall(url, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 401 || res.status === 403) {
    logout();
    return null;
  }
  return res.json();
}

function showScreen(screen) {
  document.getElementById("login-screen").classList.toggle("hidden", screen !== "login");
  document.getElementById("app-screen").classList.toggle("hidden", screen !== "app");
}

async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const data = await apiCall("/api/login", "POST", { username, password });
  if (data?.token) {
    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    document.getElementById("username-display").textContent = currentUser.username;
    showScreen("app");
    loadTasks();
  } else {
    alert(data?.error || "Login gagal");
  }
}

async function register() {
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;
  const data = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then((r) => r.json());

  if (data.message) {
    alert("Registrasi berhasil! Silakan login.");
    toggleForm();
  } else {
    alert(data.error || "Registrasi gagal");
  }
}

function toggleForm() {
  document.getElementById("login-form").classList.toggle("hidden");
  document.getElementById("register-form").classList.toggle("hidden");
}

async function loadTasks() {
  const tasks = await apiCall("/api/tasks");
  const container = document.getElementById("task-list");
  container.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center py-12 text-gray-400">Belum ada task. Buat task baru yuk!</div>`;
    return;
  }

  tasks.forEach((task) => {
    const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString("id-ID") : "-";
    const statusColor = {
      TODO: "bg-gray-100 text-gray-700",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      DONE: "bg-green-100 text-green-700",
    }[task.status];

    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow p-6 hover:shadow-xl transition";
    card.innerHTML = `
      <div class="flex justify-between">
        <h4 class="font-semibold text-lg">${task.title}</h4>
        <span class="px-3 py-1 text-xs rounded-full ${statusColor}">${task.status.replace("_", " ")}</span>
      </div>
      <p class="text-gray-600 mt-2 line-clamp-2">${task.description || "—"}</p>
      <div class="flex justify-between text-sm mt-6">
        <span class="text-gray-500">Due: ${due}</span>
        <div class="flex gap-3">
          <button onclick="editTask(${task.id})" class="text-indigo-600 hover:text-indigo-800"><i class="fas fa-edit"></i></button>
          <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function showCreateModal() {
  document.getElementById("modal-title").textContent = "Buat Task Baru";
  document.getElementById("task-id").value = "";
  document.getElementById("task-form").reset();
  document.getElementById("task-modal").classList.remove("hidden");
}

async function editTask(id) {
  const tasks = await apiCall("/api/tasks");
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  document.getElementById("modal-title").textContent = "Edit Task";
  document.getElementById("task-id").value = task.id;
  document.getElementById("title").value = task.title;
  document.getElementById("description").value = task.description || "";
  document.getElementById("status").value = task.status;
  document.getElementById("dueDate").value = task.dueDate ? task.dueDate.split("T")[0] : "";

  document.getElementById("task-modal").classList.remove("hidden");
}

function hideModal() {
  document.getElementById("task-modal").classList.add("hidden");
}

document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("task-id").value;
  const data = {
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    status: document.getElementById("status").value,
    dueDate: document.getElementById("dueDate").value || null,
  };

  if (id) {
    await apiCall(`/api/tasks/${id}`, "PUT", data);
  } else {
    await apiCall("/api/tasks", "POST", data);
  }

  hideModal();
  loadTasks();
});

async function deleteTask(id) {
  if (!confirm("Yakin hapus task ini?")) return;
  await apiCall(`/api/tasks/${id}`, "DELETE");
  loadTasks();
}

async function showLogsModal() {
  const logs = await apiCall("/api/logs");
  const container = document.getElementById("logs-content");
  container.innerHTML =
    logs
      .map(
        (log) => `
    <div class="flex justify-between border-b pb-3">
      <div>
        <span class="font-medium">${log.action}</span>
        <p class="text-xs text-gray-500">${log.details || ""}</p>
      </div>
      <div class="text-right text-xs text-gray-400">
        ${new Date(log.timestamp).toLocaleString("id-ID")}
      </div>
    </div>
  `,
      )
      .join("") || '<p class="text-gray-400">Belum ada aktivitas</p>';
  document.getElementById("logs-modal").classList.remove("hidden");
}

function hideLogsModal() {
  document.getElementById("logs-modal").classList.add("hidden");
}

function logout() {
  localStorage.removeItem("token");
  token = null;
  showScreen("login");
}

// Render login screen
document.getElementById("login-screen").innerHTML = `
  <div class="bg-white shadow-2xl rounded-3xl p-10 w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-indigo-600">Task Manager</h1>
      <p class="text-gray-500 mt-2">Internal Tim</p>
    </div>

    <div id="login-form">
      <h2 class="text-2xl font-semibold mb-6">Login</h2>
      <input id="login-username" type="text" placeholder="Username" class="w-full border rounded-2xl px-5 py-4 mb-4">
      <input id="login-password" type="password" placeholder="Password" class="w-full border rounded-2xl px-5 py-4 mb-6">
      <button onclick="login()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-medium">Masuk</button>
      <p onclick="toggleForm()" class="text-center text-indigo-600 mt-6 cursor-pointer">Belum punya akun? Daftar sekarang</p>
    </div>

    <div id="register-form" class="hidden">
      <h2 class="text-2xl font-semibold mb-6">Daftar Akun</h2>
      <input id="reg-username" type="text" placeholder="Username" class="w-full border rounded-2xl px-5 py-4 mb-4">
      <input id="reg-password" type="password" placeholder="Password" class="w-full border rounded-2xl px-5 py-4 mb-6">
      <button onclick="register()" class="w-full bg-emerald-600 text-white py-4 rounded-2xl font-medium">Daftar</button>
      <p onclick="toggleForm()" class="text-center text-indigo-600 mt-6 cursor-pointer">Sudah punya akun? Login</p>
    </div>
  </div>
`;

// Auto login jika sudah ada token
if (token) {
  currentUser = { username: "user" }; // dummy, nanti di-load ulang
  document.getElementById("username-display").textContent = "Memuat...";
  showScreen("app");
  loadTasks();
} else {
  showScreen("login");
}
