import Cookies from "js-cookie";
import LoadUsers from "./LoadUsers";

const MessageContacts = ({ receiver, setReceiver, setReceiverType }) => {
  const { individuals, classGroups, loading, error } = LoadUsers();

  if (loading) return <div className="p-4">Loading contacts...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div>
      {/* Contact list */}
      <div className="space-y-2">
        {classGroups.map((group) => (
          <div
            key={group.id}
            className={`px-2 py-3 cursor-pointer rounded-md bg-base-200 ${
              receiver === group.id ? "border shadow-md font-semibold" : ""
            }`}
            onClick={() => {
              setReceiverType("group");
              setReceiver(group.id);
            }}
          >
            <div className="flex items-center">
              <span className="mr-2">📚</span>
              <span className="line-clamp-1">{group.name}</span>
            </div>
          </div>
        ))}

        {individuals.map((user) => (
          <div
            key={user.id}
            className={`px-2 py-3 cursor-pointer rounded-md bg-base-200 ${
              receiver === user.id ? "border shadow-md font-semibold" : ""
            }`}
            onClick={() => {
              setReceiverType("individual");
              setReceiver(user.id);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {user.role && (
                  <span className="mr-2">
                    {user.role === "lecturer"
                      ? "🧑‍🏫"
                      : user.role === "admin"
                      ? "🧑‍💼"
                      : user.role === "parent"
                      ? "👩‍👦"
                      : "🧑‍🎓"}
                  </span>
                )}
                <span className="line-clamp-1">{user.name}</span>
              </div>
              {user.role && (
                <span className="px-1 ml-2 text-xs capitalize border rounded">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        ))}

        {individuals.length === 0 && (
          <div className="p-4 text-center text-gray-500">No contacts found</div>
        )}

        {classGroups.length === 0 &&
          JSON.parse(Cookies.get("auth"))["user_type"] !== "parent" &&
          JSON.parse(Cookies.get("auth"))["user_type"] !== "admin" && (
            <div className="p-4 text-center text-gray-500">
              No class groups found
            </div>
          )}
      </div>
    </div>
  );
};

export default MessageContacts;
