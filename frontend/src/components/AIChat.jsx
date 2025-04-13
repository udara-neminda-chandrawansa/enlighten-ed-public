import React, { useState } from "react";

const AIChat = () => {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResponse(""); // Clear previous response

    try {
      const res = await fetch("https://enlighten-ed.onrender.com/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setResponse(data.reply);
    } catch (error) {
      setResponse("Error fetching response.");
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full p-3 border rounded-md"
          rows="3"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          className="w-full py-2 text-white transition rounded bg-info hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "Loading..." : "Send"}
        </button>
      </form>
      {response && (
        <div className="p-3 mt-4 overflow-y-scroll bg-base-100 h-[30dvh] border rounded-md">
          <strong>AI: </strong>
          {response}
        </div>
      )}
      {loading ? (<span className="loading loading-dots loading-lg"></span>) : ""}
    </div>
  );
};

export default AIChat;
