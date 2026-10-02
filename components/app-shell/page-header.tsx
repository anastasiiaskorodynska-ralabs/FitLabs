type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex flex-none flex-col gap-3.5 border-b border-line px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{title}</h1>
      {children}
    </header>
  );
}
