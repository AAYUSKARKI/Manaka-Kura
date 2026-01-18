import { useEffect } from "react";
import ManakaKura from "./components/ManakaKura/ManakaKura"


function App() {
  useEffect(() => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, []);
  return (
    <ManakaKura />
  )
}

export default App