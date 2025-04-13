import "./App.css";
import { Route, Switch } from "wouter";
import Navbar from "./components/Nav";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dash";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="flex flex-col min-h-dvh">
      <Navbar></Navbar>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/users" component={Dashboard} />
        <Route path="/sign-in">
          <Auth reqType={"Sign In"} />
        </Route>
        <Route path="/sign-up">
          <Auth reqType={"Sign Up"} />
        </Route>

        {/* Default route in a switch   */}
        <Route>
          <div className="grid flex-grow px-4 bg-white place-content-center">
            <h1 className="tracking-widest text-gray-500 uppercase">
              404 | Not Found
            </h1>
          </div>
        </Route>
      </Switch>
      <Footer></Footer>
    </div>
  );
}
