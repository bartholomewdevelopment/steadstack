import { Outlet } from 'react-router-dom';
import { AssetsNav } from '../components/assets';

export default function AssetsLayout() {
  return (
    <div>
      <AssetsNav />
      <Outlet />
    </div>
  );
}
