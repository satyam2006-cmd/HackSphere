"use client";
import React from "react";

export interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export const ContainerScroll = ({
  titleComponent,
  children,
  className = "",
}: ContainerScrollProps) => {
  return (
    <div className={`w-full relative flex flex-col items-center justify-center py-2 sm:py-4 ${className}`}>
      <div className="w-full relative">
        <Header titleComponent={titleComponent} />
        <Card>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ titleComponent }: { titleComponent: React.ReactNode }) => {
  return (
    <div className="w-full max-w-5xl mx-auto text-center mb-5">
      {titleComponent}
    </div>
  );
};

export const Card = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl md:rounded-3xl border-2 border-black bg-white dark:bg-zinc-900 shadow-none p-1.5 sm:p-2.5">
      <div className="w-full overflow-hidden rounded-xl md:rounded-2xl bg-white dark:bg-zinc-900">
        {children}
      </div>
    </div>
  );
};

export default ContainerScroll;
