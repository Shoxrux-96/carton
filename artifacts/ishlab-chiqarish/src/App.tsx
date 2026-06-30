import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Overview from "./pages/dashboard/Overview";
import Products from "./pages/dashboard/Products";
import Production from "./pages/dashboard/Production";
import Warehouse from "./pages/dashboard/Warehouse";
import Sales from "./pages/dashboard/Sales";
import Profile from "./pages/dashboard/Profile";
import Orders from "./pages/dashboard/Orders";
import Leads from "./pages/dashboard/Leads";
import Clients from "./pages/dashboard/Clients";
import Delivery from "./pages/dashboard/Delivery";
import Employees from "./pages/dashboard/Employees";
import Attendance from "./pages/dashboard/Attendance";
import Finance from "./pages/dashboard/Finance";
import NotFound from "./pages/not-found";
import ProductView3D from "./pages/ProductView3D";
import MobileHome from "./pages/mobile/MobileHome";
import MobileAttendance from "./pages/mobile/MobileAttendance";
import MobileAttendanceReport from "./pages/mobile/MobileAttendanceReport";
import MobileOrders from "./pages/mobile/MobileOrders";
import MobileProducts from "./pages/mobile/MobileProducts";
import MobileProduction from "./pages/mobile/MobileProduction";
import MobileDelivery from "./pages/mobile/MobileDelivery";
import MobileProfile from "./pages/mobile/MobileProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard" component={Overview} />
      <Route path="/dashboard/products" component={Products} />
      <Route path="/dashboard/production" component={Production} />
      <Route path="/dashboard/warehouse" component={Warehouse} />
      <Route path="/dashboard/sales" component={Sales} />
      <Route path="/dashboard/orders" component={Orders} />
      <Route path="/dashboard/leads" component={Leads} />
      <Route path="/dashboard/clients" component={Clients} />
      <Route path="/dashboard/delivery" component={Delivery} />
      <Route path="/dashboard/employees" component={Employees} />
      <Route path="/dashboard/attendance" component={Attendance} />
      <Route path="/dashboard/finance" component={Finance} />
      <Route path="/dashboard/profile" component={Profile} />
      
      <Route path="/product/:id/3d" component={ProductView3D} />

      {/* Mobile app routes */}
      <Route path="/mobile" component={MobileHome} />
      <Route path="/mobile/attendance" component={MobileAttendance} />
      <Route path="/mobile/attendance/report" component={MobileAttendanceReport} />
      <Route path="/mobile/orders" component={MobileOrders} />
      <Route path="/mobile/products" component={MobileProducts} />
      <Route path="/mobile/production" component={MobileProduction} />
      <Route path="/mobile/delivery" component={MobileDelivery} />
      <Route path="/mobile/profile" component={MobileProfile} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
