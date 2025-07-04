import { Hero } from '../sections';
// Don't import these until you're using them:
// import { Footer, Navbar } from '../components';
// import { About, Menu } from '../sections';

const Home = () => (
  <div className="bg-primary-black w-full h-full overflow-hidden">
    <Hero />
    <div className="relative" />
  </div>
);

export default Home;
