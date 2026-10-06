"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden pb-20 pt-10">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-3xl sm:text-4xl font-semibold text-black dark:text-white">
              Unleash the power of <br />
              <span className="text-4xl md:text-[5rem] font-bold mt-1 leading-none text-indigo-600 dark:text-indigo-400">
                AI Lead Intelligence
              </span>
            </h1>
          </>
        }
      >
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2600&auto=format&fit=crop"
          alt="CRM Analytics and Lead Intelligence Dashboard"
          className="mx-auto rounded-2xl object-cover h-full w-full object-left-top shadow-inner"
          draggable={false}
        />
      </ContainerScroll>
    </div>
  );
}
export default HeroScrollDemo;
