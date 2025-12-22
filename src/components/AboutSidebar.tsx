import React from 'react';

interface SidebarItem {
  title: string;
  link: string;
}

const sidebarItems: SidebarItem[] = [
  { title: 'About', link: '/about' },
];

const Sidebar: React.FC = () => {
  return (
    <nav style={{ width: '200px', borderRight: '1px solid #ddd', padding: '1rem' }}>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sidebarItems.map((item, index) => (
          <li key={index} style={{ margin: '0.5rem 0' }}>
            <a href={item.link} style={{ textDecoration: 'none', color: '#0070f3' }}>
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;