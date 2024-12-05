import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Register from "./components/Register";
import Authenticate from "./components/Authenticate";

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
        <h1 className="text-3xl font-bold mb-6">Realtime Face Based Authentication</h1>
        <nav className="flex space-x-4 mb-8">
          <Link to="/register" className="text-blue-500 hover:underline">Register</Link>
          <Link to="/authenticate" className="text-blue-500 hover:underline">Authenticate</Link>
        </nav>

        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/authenticate" element={<Authenticate />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
