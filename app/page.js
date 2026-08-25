import library from "../data/deals.json";
import Comparator from "../components/Comparator";

export default function Home() {
  return <Comparator library={library} />;
}