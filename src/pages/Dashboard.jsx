import { useAuthStore } from "../stores/authStore";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to Your Dashboard
          </h1>
          <p className="text-gray-600">You have successfully authenticated!</p>
        </div>

        {/* User Avatar */}
        <div className="flex justify-center mb-6">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.username}
              referrerPolicy="no-referrer"
              className="w-32 h-32 rounded-full shadow-lg object-cover border-4 border-indigo-500"
              onError={(e) => {
                console.error(
                  "Failed to load profile picture:",
                  user.profile_picture
                );
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User Information */}
        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              Username
            </label>
            <p className="text-lg text-gray-800">{user?.username}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              Email
            </label>
            <p className="text-lg text-gray-800">{user?.email}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              Full Name
            </label>
            <p className="text-lg text-gray-800">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : "Not provided"}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              Account Status
            </label>
            <div className="flex items-center gap-2">
              {user?.is_verified ? (
                <>
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-lg text-green-600 font-semibold">
                    Verified
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-lg text-yellow-600 font-semibold">
                    Pending Verification
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
          >
            Logout
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Member since {new Date(user?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
