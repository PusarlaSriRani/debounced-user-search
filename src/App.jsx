
import { useState, useEffect, useMemo, useRef } from "react";
import { debounce } from "./utils";
import "./App.css";

// Highlight matching search text
function HighlightText({ text, query }) {
  if (!query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  return text.split(regex).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <strong key={index}>{part}</strong>
    ) : (
      part
    )
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Store previous search results
  const cache = useRef(new Map());

  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchTerm, signal) => {
        if (signal.aborted) return;

        setLoading(true);
        setError("");

        try {
          const cacheKey = searchTerm.toLowerCase();

          // Check cache first
          if (cache.current.has(cacheKey)) {
            setUsers(cache.current.get(cacheKey));
            return;
          }

          // Fetch data from API
          const response = await fetch(
            `https://dummyjson.com/users/search?q=${encodeURIComponent(searchTerm)}`,
            { signal }
          );

          if (!response.ok) {
            throw new Error("API request failed");
          }

          const data = await response.json();

          if (signal.aborted) return;

          const fetchedUsers = data.users || [];

          // Save results in cache
          cache.current.set(cacheKey, fetchedUsers);

          setUsers(fetchedUsers);

        } catch (err) {
          if (err.name !== "AbortError") {
            setError("Something went wrong!");
            setUsers([]);
          }
        } finally {
          if (!signal.aborted) {
            setLoading(false);
          }
        }
      }, 400),
    []
  );

  useEffect(() => {
    const searchTerm = query.trim();

    if (!searchTerm) {
      setUsers([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();

    debouncedSearch(searchTerm, controller.signal);

    return () => {
      debouncedSearch.cancel();
      controller.abort();
    };
  }, [query, debouncedSearch]);

  return (
    <div className="container">
      <h1>Debounced User Search</h1>

      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!query.trim() && <p>Type to search</p>}

      {loading && <p>Loading...</p>}

      {error && <p className="error">{error}</p>}

      {!loading && !error && users.map((user) => (
        <div className="user-card" key={user.id}>
          <h3>
            <HighlightText
              text={`${user.firstName} ${user.lastName}`}
              query={query.trim()}
            />
          </h3>

          <p>
            <HighlightText text={user.email} query={query.trim()} />
          </p>

          <p>{user.address?.city}</p>
        </div>
      ))}

      {!loading && !error && query.trim() && users.length === 0 && (
        <p>No users found.</p>
      )}
    </div>
  );
}

export default App;
