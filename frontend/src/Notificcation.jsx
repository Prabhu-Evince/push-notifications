import React, { useState, useEffect, useRef } from 'react';
import { Bell, User } from 'lucide-react';

export default function NotificationApp() {
    const [notifications, setNotifications] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);

    const [registerData, setRegisterData] = useState({ email: "", role: "user" });

    const [formData, setFormData] = useState({
        targetUserId: '',
        title: '',
        message: '',
        type: 'info',
        role: ''
    });

    const [unreadCount, setUnreadCount] = useState(0);

    const wsRef = useRef(null);
    const API_URL = 'http://localhost:3001';
    const WS_URL = 'ws://localhost:3001';

    const fetchOfflineNotifications = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/${userId}?limit=50`);
            const data = await response.json();

            if (data.success) {
                setNotifications(data.notifications);
                const unread = data.notifications.filter(n => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (error) { }
    };

    useEffect(() => {
        if (!isAuthenticated || !email) return;

        const connectWebSocket = () => {
            try {
                const ws = new WebSocket(WS_URL);
                console.log(userId)
                ws.onopen = () => {
                    setWsConnected(true);
                    ws.send(JSON.stringify({
                        type: 'auth',
                        userId: userId
                    }));
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'notification') {
                        addNotification(data.data);
                    }
                };

                ws.onclose = () => {
                    setWsConnected(false);
                    setTimeout(connectWebSocket, 3000);
                };

                wsRef.current = ws;
            } catch (error) {
                setTimeout(connectWebSocket, 3000);
            }
        };

        connectWebSocket();

        return () => wsRef.current && wsRef.current.close();
    }, [isAuthenticated, userId]);

    // ✅ Fetch users and roles
    useEffect(() => {
        const fetchUsers = async () => {
            const res = await fetch(`${API_URL}/api/users`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);

                const uniqueRoles = [...new Set(data.users.map(u => u.role))];
                setRoles(uniqueRoles);
            }
        };
        fetchUsers();
    }, []);

    const addNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
        }
    };

    // ✅ LOGIN HANDLER (email based)
    const handleLogin = async () => {
        if (!email.trim()) return alert("Enter email");

        const res = await fetch(`${API_URL}/api/user/exists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!data.exists) return alert("Email not registered!");
        setUserId(data.user.user_id);
        setIsAuthenticated(true);
        fetchOfflineNotifications(data.user.user_id);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setNotifications([]);
        setUnreadCount(0);
        wsRef.current && wsRef.current.close();
    };

    // ✅ SEND TO SINGLE USER
    const sendNotification = async () => {
        if (!formData.targetUserId || !formData.title || !formData.message)
            return alert("Fill all fields");

        const res = await fetch(`${API_URL}/api/notifications/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.targetUserId,
                title: formData.title,
                message: formData.message,
            })
        });

        const data = await res.json();
        if (data.success) {
            alert("Sent!");
            setFormData({ targetUserId: "", title: "", message: "", type: "info", role: "" });
        }
    };

    // ✅ SEND TO ROLE
    const sendToRole = async () => {
        if (!formData.role || !formData.title || !formData.message)
            return alert("Fill all fields");

        await fetch(`${API_URL}/api/notifications/send-role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        alert("Sent to role!");
    };

    // ✅ REGISTER USER PAGE
    if (showRegister) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                    <h2 className="text-2xl font-semibold mb-4">Register User</h2>

                    <input
                        type="email"
                        value={registerData.email}
                        onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-3"
                        placeholder="Email"
                    />

                    <select
                        value={registerData.role}
                        onChange={e => setRegisterData({ ...registerData, role: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-4"
                    >
                        <option value="user">User</option>
                        <option value="staff">Staff</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                    </select>

                    <button
                        onClick={async () => {
                            await fetch(`${API_URL}/api/user/register`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(registerData)
                            });
                            alert("Registered!");
                            setShowRegister(false);
                        }}
                        className="w-full bg-purple-600 text-white py-2 rounded"
                    >
                        Register
                    </button>

                    <button
                        onClick={() => setShowRegister(false)}
                        className="text-blue-600 mt-3 w-full text-sm"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // ✅ LOGIN PAGE
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                    <h2 className="text-3xl font-bold text-center mb-6">Login</h2>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border px-3 py-3 rounded-lg mb-4"
                        placeholder="user@example.com"
                    />

                    <button onClick={handleLogin} className="w-full bg-purple-600 text-white py-3 rounded-lg">
                        Login
                    </button>

                    <p
                        onClick={() => setShowRegister(true)}
                        className="mt-4 text-center text-blue-600 cursor-pointer"
                    >
                        New user? Register here
                    </p>
                </div>
            </div>
        );
    }

    // ✅ MAIN DASHBOARD
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">

            <div className="bg-white p-6 rounded-lg shadow mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="text-purple-600" /> Notification Dashboard
                </h1>
                <button onClick={handleLogout} className="bg-red-500 px-4 py-2 text-white rounded">Logout</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SEND NOTIFICATION */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="font-bold text-lg mb-3">Send Notification</h2>

                    {/* ✅ User Dropdown */}
                    <select
                        value={formData.targetUserId}
                        onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-3"
                    >
                        <option value="">Select User</option>
                        {users.map(u => (
                            <option key={u.user_id} value={u.email}>
                                {u.email} ({u.role})
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-3"
                        placeholder="Title"
                    />

                    <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-3"
                        placeholder="Message"
                    />

                  
                    <button onClick={sendNotification} className="w-full bg-purple-600 text-white py-2 rounded mb-4">
                        Send to User
                    </button>

                    {/* ✅ Send to Role */}
                    <h3 className="font-semibold mb-2">Send to Role</h3>

                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full border px-3 py-2 rounded mb-3"
                    >
                        <option value="">Select Role</option>
                        {roles.map((r, i) => (
                            <option key={i} value={r}>{r}</option>
                        ))}
                    </select>

                    <button onClick={sendToRole} className="w-full bg-blue-600 text-white py-2 rounded">
                        Send to Role
                    </button>
                </div>

                {/* NOTIFICATION LIST */}
                <div className="bg-white p-6 rounded-lg shadow max-h-[600px] overflow-y-auto">
                    <h2 className="font-bold text-lg mb-4">My Notifications</h2>

                    {notifications.length === 0 ? (
                        <p className="text-gray-500 text-center">No notifications</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className="border p-3 rounded mb-2 bg-gray-50">
                                <p className="font-semibold">{n.title}</p>
                                <p className="text-sm">{n.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(n.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}
