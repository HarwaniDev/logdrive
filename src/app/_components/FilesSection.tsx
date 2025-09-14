"use client";

import React, { useRef, useEffect, useState } from "react";

export interface FileItemProps {
	id: string;
	name: string;
	size?: string;
	createdAt: string;
	icon?: string;
	s3Key: string;
	owner: string;
	expiryDate?: string;
	deletedBy?: string;
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
	onUpdateExpiry?: (fileId: string) => void;
	isTrash?: boolean;
	showExpiry?: boolean;
}

// Custom hook for dynamic menu positioning
function useMenuPosition(fileId: string, isOpen: boolean, viewMode: "grid" | "list", clickCoordinates?: { x: number; y: number }) {
	const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
	const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
	const fileRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen || !fileRef.current) return;

		const fileElement = fileRef.current;
		const fileRect = fileElement.getBoundingClientRect();
		const menuHeight = 200; // Approximate menu height
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - fileRect.bottom;
		const spaceAbove = fileRect.top;
		
		let newPosition: 'top' | 'bottom' = 'bottom';
		let newStyle: React.CSSProperties = {};

		// Only apply fixed positioning logic for list view
		if (viewMode === "list") {
			// Use click coordinates if available, otherwise fall back to calculated position
			if (clickCoordinates) {
				const menuWidth = 160; // w-40 = 160px
				const menuHeight = 200; // Approximate menu height
				
				// Check if menu would go off screen and adjust
				let left = clickCoordinates.x;
				let top = clickCoordinates.y + 4; // Small offset below click
				
				// Adjust horizontal position if menu would go off right edge
				if (left + menuWidth > window.innerWidth) {
					left = window.innerWidth - menuWidth - 10; // 10px margin from edge
				}
				
				// Adjust vertical position if menu would go off bottom edge
				if (top + menuHeight > window.innerHeight) {
					top = clickCoordinates.y - menuHeight - 4; // Show above click
					newPosition = 'top';
				} else {
					newPosition = 'bottom';
				}
				
				newStyle = { 
					top: `${top}px`,
					left: `${left}px`
				};
			} else {
				// Fallback to calculated position if no click coordinates
				if (spaceBelow >= menuHeight) {
					newPosition = 'bottom';
					newStyle = { 
						top: `${fileRect.bottom + 4}px`,
						left: `${fileRect.right - 160}px` // 160px is menu width (w-40)
					};
				} 
				else if (spaceAbove >= menuHeight) {
					newPosition = 'top';
					newStyle = { 
						bottom: `${viewportHeight - fileRect.top + 4}px`,
						left: `${fileRect.right - 160}px`
					};
				}
				else if (spaceAbove > spaceBelow) {
					newPosition = 'top';
					newStyle = { 
						bottom: `${viewportHeight - fileRect.top + 4}px`,
						left: `${fileRect.right - 160}px`
					};
				} else {
					newPosition = 'bottom';
					newStyle = { 
						top: `${fileRect.bottom + 4}px`,
						left: `${fileRect.right - 160}px`
					};
				}
			}
		} else {
			// For grid view, use original absolute positioning logic
			if (spaceBelow >= menuHeight) {
				newPosition = 'bottom';
				newStyle = { top: '100%' };
			} 
			else if (spaceAbove >= menuHeight) {
				newPosition = 'top';
				newStyle = { bottom: '100%' };
			}
			else if (spaceAbove > spaceBelow) {
				newPosition = 'top';
				newStyle = { bottom: '100%' };
			} else {
				newPosition = 'bottom';
				newStyle = { top: '100%' };
			}
		}

		setMenuPosition(newPosition);
		setMenuStyle(newStyle);
	}, [isOpen, fileId, viewMode, clickCoordinates]);

	return { menuPosition, menuStyle, fileRef, menuRef };
}

// File row component for desktop view
function DesktopFileRow({ 
	file, 
	openFileMenuId, 
	onToggleMenu, 
	onPreview, 
	onDownload, 
	onDelete, 
	onRestore, 
	onUpdateExpiry, 
	isTrash,
	viewMode
}: {
	file: FileItemProps;
	openFileMenuId: string | null;
	onToggleMenu: (fileId: string) => void;
	onPreview?: (fileId: string) => void;
	onDownload?: (fileId: string) => void;
	onDelete?: (fileId: string) => void;
	onRestore?: (fileId: string) => void;
	onUpdateExpiry?: (fileId: string) => void;
	isTrash: boolean;
	viewMode: "grid" | "list";
}) {
	const isMenuOpen = openFileMenuId === file.id;
	const [clickCoordinates, setClickCoordinates] = useState<{ x: number; y: number } | undefined>();
	const { menuStyle, fileRef, menuRef } = useMenuPosition(file.id, isMenuOpen, viewMode, clickCoordinates);

	return (
		<div
			ref={fileRef}
			className="relative px-6 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors select-none"
			onClick={(e) => {
				e.stopPropagation();
				if (viewMode === "list") {
					setClickCoordinates({ x: e.clientX, y: e.clientY });
				}
				onToggleMenu(file.id);
			}}
		>
			<div className="grid grid-cols-16 gap-4 items-center">
				<div className="col-span-6 flex items-center space-x-3">
					<span className="text-xl">{file.icon}</span>
					<span className="font-medium text-gray-900">{file.name}</span>
				</div>
				<div className="col-span-2 text-sm text-gray-500">{file.size}</div>
				<div className="col-span-4 text-sm text-gray-500">{file.createdAt}</div>
				{file.expiryDate ? <div className="col-span-4 text-sm text-gray-500">{file.expiryDate}</div> : <div className="col-span-4 text-sm text-gray-500">-</div>}
			</div>

			{isMenuOpen && (
				<div 
					ref={menuRef}
					className={`${viewMode === "list" ? "fixed z-[9999]" : "absolute right-4 z-50"} w-40 bg-white rounded-md shadow-lg border border-gray-200`}
					style={viewMode === "list" ? menuStyle : {}}
				>
					<div className="py-1">
						{!isTrash && onPreview && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onPreview(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
							>
								Move to trash
							</button>
						)}
						{!isTrash && onUpdateExpiry && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onUpdateExpiry(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
							>
								Add/Update expiry date
							</button>
						)}
						{isTrash && onRestore && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onRestore(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
							>
								Restore file
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// File row component for mobile view
function MobileFileRow({ 
	file, 
	openFileMenuId, 
	onToggleMenu, 
	onPreview, 
	onDownload, 
	onDelete, 
	onRestore, 
	onUpdateExpiry, 
	isTrash,
	viewMode
}: {
	file: FileItemProps;
	openFileMenuId: string | null;
	onToggleMenu: (fileId: string) => void;
	onPreview?: (fileId: string) => void;
	onDownload?: (fileId: string) => void;
	onDelete?: (fileId: string) => void;
	onRestore?: (fileId: string) => void;
	onUpdateExpiry?: (fileId: string) => void;
	isTrash: boolean;
	viewMode: "grid" | "list";
}) {
	const isMenuOpen = openFileMenuId === file.id;
	const [clickCoordinates, setClickCoordinates] = useState<{ x: number; y: number } | undefined>();
	const { menuStyle, fileRef, menuRef } = useMenuPosition(file.id, isMenuOpen, viewMode, clickCoordinates);

	return (
		<div
			ref={fileRef}
			className="relative px-4 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors select-none"
			onClick={(e) => {
				e.stopPropagation();
				if (viewMode === "list") {
					setClickCoordinates({ x: e.clientX, y: e.clientY });
				}
				onToggleMenu(file.id);
			}}
		>
			<div className="flex items-center">
				<div className="w-48 flex-shrink-0 flex items-center space-x-3">
					<span className="text-xl">{file.icon}</span>
					<span className="font-medium text-gray-900 truncate">{file.name}</span>
				</div>
				<div className="w-20 flex-shrink-0 text-sm text-gray-500">{file.size}</div>
				<div className="w-32 flex-shrink-0 text-sm text-gray-500">{file.createdAt}</div>
				<div className="w-32 flex-shrink-0 text-sm text-gray-500">{file.expiryDate || "-"}</div>
			</div>

			{isMenuOpen && (
				<div 
					ref={menuRef}
					className={`${viewMode === "list" ? "fixed z-[9999]" : "absolute right-4 z-50"} w-40 bg-white rounded-md shadow-lg border border-gray-200`}
					style={viewMode === "list" ? menuStyle : {}}
				>
					<div className="py-1">
						{!isTrash && onPreview && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onPreview(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
							>
								Move to trash
							</button>
						)}
						{!isTrash && onUpdateExpiry && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onUpdateExpiry(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
							>
								Add/Update expiry date
							</button>
						)}
						{isTrash && onRestore && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onRestore(file.id);
								}}
								className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
							>
								Restore file
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
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
	onUpdateExpiry,
	isTrash = false,
	showExpiry = false
}: FilesSectionProps) {
	const sortedFiles = files.sort((a, b) => {
		if (a.expiryDate && b.expiryDate) {
			const [dayA, monthA, yearA] = a.expiryDate.split("/").map(Number);
			const [dayB, monthB, yearB] = b.expiryDate.split("/").map(Number);

			const dateA = new Date(yearA!, monthA! - 1, dayA).getTime();
			const dateB = new Date(yearB!, monthB! - 1, dayB).getTime();

			return dateA - dateB;
		} else {
			return 0;
		}
	});
	return (
		<section>
			<h2 className="text-lg font-semibold text-gray-900 mb-4">Files</h2>
			{viewMode === "grid" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{sortedFiles.map((file) => (
						<div
							key={file.id}
							className="group relative bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer select-none"
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
								<p className="text-xs text-gray-900 mt-1 font-bold">{showExpiry && file.expiryDate ? `Exp: ${file.expiryDate}` : ""}</p>
								<p className="text-xs text-gray-900 mt-1 font-bold">{isTrash && `Deleted by: ${file.deletedBy}`}</p>
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
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
											>
												Move to trash
											</button>
										)}
										{!isTrash && onUpdateExpiry && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onUpdateExpiry(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
											>
												Add/Update expiry date
											</button>
										)}
										{isTrash && onRestore && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													onRestore(file.id);
												}}
												className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
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
					{/* Desktop view - full table */}
					<div className="hidden md:block">
						<div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
							<div className="grid grid-cols-16 gap-4 text-sm font-medium text-gray-500">
								<div className="col-span-6">Name</div>
								<div className="col-span-2">Size</div>
								<div className="col-span-4">Created on</div>
								<div className="col-span-4">Expiry date</div>
							</div>
						</div>
					{sortedFiles.map((file) => (
						<DesktopFileRow
							key={file.id}
							file={file}
							openFileMenuId={openFileMenuId}
							onToggleMenu={onToggleMenu}
							onPreview={onPreview}
							onDownload={onDownload}
							onDelete={onDelete}
							onRestore={onRestore}
							onUpdateExpiry={onUpdateExpiry}
							isTrash={isTrash}
							viewMode={viewMode}
						/>
					))}
					</div>

					{/* Mobile view - horizontally scrollable table */}
					<div className="md:hidden">
						<div className="overflow-x-auto">
							<div className="min-w-[600px]">
								<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
									<div className="flex text-sm font-medium text-gray-500">
										<div className="w-48 flex-shrink-0">Name</div>
										<div className="w-20 flex-shrink-0">Size</div>
										<div className="w-32 flex-shrink-0">Created on</div>
										<div className="w-32 flex-shrink-0">Expiry date</div>
									</div>
								</div>
								{sortedFiles.map((file) => (
									<MobileFileRow
										key={file.id}
										file={file}
										openFileMenuId={openFileMenuId}
										onToggleMenu={onToggleMenu}
										onPreview={onPreview}
										onDownload={onDownload}
										onDelete={onDelete}
										onRestore={onRestore}
										onUpdateExpiry={onUpdateExpiry}
										isTrash={isTrash}
										viewMode={viewMode}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}