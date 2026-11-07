import { useState } from "react";
import { Book } from "./components/book/Book";
import { readInviteToken } from "./lib/invite-token";

export default function App() {
  const [invite] = useState(readInviteToken);
  return <Book invite={invite} />;
}
