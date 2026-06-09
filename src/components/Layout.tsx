const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="lg:pl-20 bg-light-primary dark:bg-dark-primary min-h-screen">
      <div className="mx-4 max-w-screen-lg lg:ml-[calc(18rem+2.5rem)] lg:mr-10 lg:max-w-[calc(100vw-18rem-5rem)]">{children}</div>
    </main>
  );
};

export default Layout;
