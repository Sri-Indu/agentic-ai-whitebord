"use client";

import Image from "next/image";
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save, Share } from "lucide-react";

type Props = {
  selectedTab: (value: string) => void;
};

function WorkspaceHeader({ selectedTab }: Props) {
  return (
    <div className="p-3 border-b flex justify-between">
      <div className="flex gap-2 items-center">
        <Image
          src="/logo.svg"
          alt="logo"
          width={35}
          height={35}
        />

        <h2>Workspace Name</h2>
      </div>

      <div>
        <Tabs
          defaultValue="whiteboard"
          className="w-[400px]"
          onValueChange={(value) => selectedTab(value)}
        >
          <TabsList>
            <TabsTrigger value="whiteboard">
              Whiteboard
            </TabsTrigger>

            <TabsTrigger value="doc">
              Document
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className='flex gap-2'>
        <Button> <Save/>Save</Button>
        <Button variant={'outline'}> <Share/>Share</Button>
      </div>
    </div>
  );
}

export default WorkspaceHeader;