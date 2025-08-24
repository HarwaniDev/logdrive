"use client";

import React from "react";

export interface FileItemProps {
	id: string;
	name: string;
	size?: string;
	createdAt: string;
	icon?: string;
	s3Key: string;
	owner: string;
}

interface FilesSectionProps {
	viewMode: "grid" | "list";
	files: FileItemProps[];
	openFileMenuId: string | null;
	onToggleMenu: (fileId: string) => void;
	onPreview?: (fileId: string) => void;
	onDownload?: (fileId: string) => void;
	onDelete?: (fileId: string) => void;
	onRestore?: (fileId: string) => void;
	isTrash?: boolean;
}

export default function FilesSection({
	viewMode,
	files,
	openFileMenuId,
	onToggleMenu,
	onPreview,
	onDownload,
	onDelete,
	onRestore,
	isTrash = false
}: FilesSectionProps) {
	return (
		<section>
			<h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>
			{viewMode === "grid" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{files.map((file) => (
						<div
							key={file.id}
							className="group relative bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMenu(file.id);
							}}
						>
							<div className="flex flex-col items-center text-center">
								<div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
									<span className="text-2xl">{file.icon}</span>
								</div>
								<h3 className="font-medium text-gray-900 text-sm truncate w-full">{file.name}</h3>
								<p className="text-xs text-gray-500 mt-1">{file.owner} | {file.createdAt} | {file.size}</p>
							</div>

							{openFileMenuId === file.id && (
								<div className="absolute right-2 top-2 z-50 w-40 bg-white rounded-md shadow-lg border border-gray-200">
									<div className="py-1">
										{!isTrash && onPreview && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onPreview(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Preview
											</button>
										)}
										{!isTrash && onDownload && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDownload(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Download
											</button>
										)}
										{!isTrash && onDelete && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDelete(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Move to trash
											</button>
										)}
										{isTrash && onRestore && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onRestore(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50"
											>
												Restore file
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
							<div className="col-span-6">Name</div>
							<div className="col-span-2">Size</div>
							<div className="col-span-4">Created on</div>
						</div>
					</div>
					{files.map((file) => (
						<div
							key={file.id}
							className="relative px-6 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMenu(file.id);
							}}
						>
							<div className="grid grid-cols-12 gap-4 items-center">
								<div className="col-span-6 flex items-center space-x-3">
									<span className="text-xl">{file.icon}</span>
									<span className="font-medium text-gray-900">{file.name}</span>
								</div>
								<div className="col-span-2 text-sm text-gray-500">{file.size}</div>
								<div className="col-span-4 text-sm text-gray-500">{file.createdAt}</div>
							</div>

							{openFileMenuId === file.id && (
								<div className="absolute right-4 top-2 z-50 w-40 bg-white rounded-md shadow-lg border border-gray-200">
									<div className="py-1">
										{!isTrash && onPreview && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onPreview(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Preview
											</button>
										)}
										{!isTrash && onDownload && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDownload(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Download
											</button>
										)}
										{!isTrash && onDelete && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDelete(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												Move to trash
											</button>
										)}
										{isTrash && onRestore && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onRestore(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50"
											>
												Restore file
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</section>
	);
}


