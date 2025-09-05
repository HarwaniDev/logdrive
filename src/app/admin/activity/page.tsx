"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import Header from "~/app/_components/Header";
import OnlineUsers from "~/app/_components/OnlineUsers";

// interface ActivityLog {
//   id: string;
//   userId: string;
//   fileId: string;
//   action: string;
//   timestamp: string;
//   userAgent?: string;
//   user: {
//     id: string;
//     name: string;
//     email: string;
//     role: string;
//   };
//   file: {
//     id: string;
//     name: string;
//     type: string;
//     s3Key: string;
//   };
// }

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  // Check if user is admin
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/signin");
      return;
    }

    if (session.user.role !== "admin") {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  // Fetch all employees
  const { data: employees, error: employeesError, isLoading: isLoadingEmployees } = api.user.getEmployees.useQuery(
    undefined,
    {
      enabled: !isLoading && session?.user.role === "admin",
    }
  );

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onToggleNew={() => {}}
          onCreateFolder={() => {}}
          onUploadFile={() => {}}
          showNewDropdown={false}
          userName={session?.user?.name ?? null}
          onSignOut={() => signOut()}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null; // Will redirect in useEffect
  }

  if (employeesError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onToggleNew={() => {}}
          onCreateFolder={() => {}}
          onUploadFile={() => {}}
          showNewDropdown={false}
          userName={session?.user?.name ?? null}
          onSignOut={() => signOut()}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-red-600 text-lg">Error: {employeesError.message}</div>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString("en-IN");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return "bg-green-100 text-green-800";
      case "DOWNLOAD":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "PREVIEW":
        return "bg-purple-100 text-purple-800";
      case "RENAME":
        return "bg-yellow-100 text-yellow-800";
      case "CREATE_FOLDER":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onToggleNew={() => {}}
        onCreateFolder={() => {}}
        onUploadFile={() => {}}
        showNewDropdown={false}
        userName={session?.user?.name ?? null}
        onSignOut={() => signOut()}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employee Activity Logs</h1>
          <p className="mt-2 text-gray-600">
            Monitor all employee activities across the system
          </p>
        </div>

        {/* Online Users */}
        <div className="mb-6">
          <OnlineUsers />
        </div>

        {/* All Activities Accordion */}
        <div className="mb-6">
          <AllActivitiesAccordion />
        </div>

        {isLoadingEmployees ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg">Loading employees...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {employees?.map((employee) => (
              <EmployeeAccordion
                key={employee.id}
                employee={employee}
                isExpanded={expandedEmployees.has(employee.id)}
                onToggle={() => toggleEmployeeExpansion(employee.id)}
              />
            ))}

            {(!employees || employees.length === 0) && (
              <div className="text-center py-12">
                <div className="text-gray-500">No employees found</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// All Activities Accordion Component
function AllActivitiesAccordion() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch all activity logs
  const { data: allActivityLogs, error, isLoading } = api.activity.getAllActivityLogs.useQuery(
    undefined,
    {
      enabled: isExpanded,
    }
  );

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString("en-IN");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return "bg-green-100 text-green-800";
      case "DOWNLOAD":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "PREVIEW":
        return "bg-purple-100 text-purple-800";
      case "RENAME":
        return "bg-yellow-100 text-yellow-800";
      case "CREATE_FOLDER":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  A
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-xl font-bold text-gray-900">
                All Activities
              </div>
              <div className="text-sm text-gray-500">
                View all employee activities across the system
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">
              {isExpanded ? `${allActivityLogs?.length || 0} total activities` : "Click to view all activities"}
            </span>
            {isExpanded ? (
              <span className="text-gray-400 text-lg">▼</span>
            ) : (
              <span className="text-gray-400 text-lg">▶</span>
            )}
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="px-6 py-4">
              <div className="text-center text-gray-500">Loading all activities...</div>
            </div>
          ) : error ? (
            <div className="px-6 py-4">
              <div className="text-center text-red-500">Error loading activities: {error.message}</div>
            </div>
          ) : (
            <div className="px-6 py-4">
              {allActivityLogs && allActivityLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File/Folder
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Agent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allActivityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-700">
                                    {log.user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {log.user.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {log.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                              {log.action.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {log.file.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.file.type}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                            {log.userAgent || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No activities found</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Employee Accordion Component
function EmployeeAccordion({ 
  employee, 
  isExpanded, 
  onToggle 
}: { 
  employee: Employee; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) {
  // Fetch activity logs for this specific employee
  const { data: activityLogs, error, isLoading } = api.activity.getActivityLogsOfUser.useQuery(
    { employeeId: employee.id },
    {
      enabled: isExpanded,
    }
  );

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString("en-IN");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return "bg-green-100 text-green-800";
      case "DOWNLOAD":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "PREVIEW":
        return "bg-purple-100 text-purple-800";
      case "RENAME":
        return "bg-yellow-100 text-yellow-800";
      case "CREATE_FOLDER":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {employee.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-lg font-medium text-gray-900">
                {employee.name}
              </div>
              <div className="text-sm text-gray-500">
                {employee.email}
              </div>
              <div className="text-xs text-gray-400">
                {employee.role}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">
              {isExpanded && activityLogs?.length? `${activityLogs?.length} activities` : "Click to view activities"}
            </span>
            {isExpanded ? (
              <span className="text-gray-400 text-lg">▼</span>
            ) : (
              <span className="text-gray-400 text-lg">▶</span>
            )}
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="px-6 py-4">
              <div className="text-center text-gray-500">Loading activities...</div>
            </div>
          ) : error ? (
            <div className="px-6 py-4">
              <div className="text-center text-red-500">Error loading activities: {error.message}</div>
            </div>
          ) : (
            <div className="px-6 py-4">
              {activityLogs && activityLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File/Folder
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Agent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                              {log.action.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {log.file.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.file.type}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                            {log.userAgent || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No activities found for this employee</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
