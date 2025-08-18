"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface FolderItemProps {
	id: string;
	name: string;
	itemCount: number;
	modified: string;
}

interface FoldersSectionProps {
	viewMode: "grid" | "list";
	folders: FolderItemProps[];
}

export default function FoldersSection({ viewMode, folders }: FoldersSectionProps) {
	const router = useRouter();

	return (
		<section>
			<h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
			{viewMode === "grid" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{folders.map((folder) => (
						<div
							key={folder.id}
							className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
							onClick={() => {
								router.push(`?folderId=${folder.id}`);
							}}
						>
							<div className="flex flex-col items-center text-center">
								<div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
									<span className="text-2xl">📁</span>
								</div>
								<h3 className="font-medium text-gray-900 text-sm truncate w-full">{folder.name}</h3>
								<p className="text-xs text-gray-500 mt-1">{folder.itemCount} items</p>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
							<div className="col-span-6">Name</div>
							<div className="col-span-2">Items</div>
							<div className="col-span-4">Modified</div>
						</div>
					</div>
					{folders.map((folder) => (
						<div key={folder.id} className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
							<div className="grid grid-cols-12 gap-4 items-center">
								<div className="col-span-6 flex items-center space-x-3">
									<span className="text-xl">📁</span>
									<span className="font-medium text-gray-900">{folder.name}</span>
								</div>
								<div className="col-span-2 text-sm text-gray-500">{folder.itemCount} items</div>
								<div className="col-span-4 text-sm text-gray-500">{folder.modified}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}


