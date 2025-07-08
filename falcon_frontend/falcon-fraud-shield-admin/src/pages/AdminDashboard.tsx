import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Activity, Search, LogOut, User, UserCircle, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FraudAnalytics } from "@/components/FraudAnalytics";
import { mockFraudDetection } from "@/utils/fraudDetection";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Transaction {
  id: string;
  amount: string;
  channel: string;
  beneficiary: string;
  ifsc: string;
  senderAccount: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  riskScore?: number;
  anomalyScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  fraudProbability?: number;
  beneficiaryAccount?: string;
  risk_level?: string;
  risk_score?: number;
  anomaly_score?: number;
  note?: string; // Added for notes
}

// Helper for calendar icon
function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    approved: 0,
    rejected: 0
  });
  // Filter state
  const [filter, setFilter] = useState({
    date: '',
    risk: '',
    status: '',
    user: ''
  });
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTx, setDetailsTx] = useState<Transaction | null>(null);
  const [note, setNote] = useState("");
  const [auditLog, setAuditLog] = useState<any[]>([]);


  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      navigate('/login');
      return;
    }
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(storedUser);
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filter]);

  const loadTransactions = () => {
    const stored = JSON.parse(localStorage.getItem('transactions') || '[]');
    const processedTransactions = stored.map((tx: Transaction) => {
      if (!tx.riskScore) {
        const analysis = mockFraudDetection(tx);
        return { ...tx, ...analysis };
      }
      return tx;
    });
    setTransactions(processedTransactions);
    localStorage.setItem('transactions', JSON.stringify(processedTransactions));
    // Calculate stats
    const total = processedTransactions.length;
    const flagged = processedTransactions.filter((tx: Transaction) => tx.riskLevel === 'high').length;
    const approved = processedTransactions.filter((tx: Transaction) => tx.status === 'approved').length;
    const rejected = processedTransactions.filter((tx: Transaction) => tx.status === 'rejected').length;
    setStats({ total, flagged, approved, rejected });
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    if (filter.date) {
      filtered = filtered.filter(tx => tx.timestamp && tx.timestamp.startsWith(filter.date));
    }
    if (filter.risk) {
      filtered = filtered.filter(tx => tx.riskLevel === filter.risk);
    }
    if (filter.status) {
      filtered = filtered.filter(tx => tx.status === filter.status);
    }
    if (filter.user) {
      filtered = filtered.filter(tx => tx.senderAccount?.includes(filter.user) || tx.beneficiaryAccount?.includes(filter.user));
    }
    setFilteredTransactions(filtered);
  };

  const handleTransactionAction = (id: string, action: 'approve' | 'reject') => {
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    const updatedTransactions = transactions.map(tx =>
      tx.id === id ? { ...tx, status: statusValue as 'approved' | 'rejected' } : tx
    );
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    // Add to audit log
    const log = JSON.parse(localStorage.getItem("audit_log") || "[]");
    log.push({ txId: id, action: statusValue, admin: user?.username, timestamp: new Date().toISOString() });
    localStorage.setItem("audit_log", JSON.stringify(log));
    loadTransactions();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(paginatedTransactions.map(tx => tx.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]);
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    const updatedTransactions = transactions.map(tx =>
      selected.includes(tx.id) ? { ...tx, status: statusValue as 'approved' | 'rejected' } : tx
    );
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    setSelected([]);
    loadTransactions();
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const openDetails = (tx: Transaction) => {
    setDetailsTx(tx);
    setDetailsOpen(true);
    setNote("");
    // Load audit log for this transaction
    const log = JSON.parse(localStorage.getItem("audit_log") || "[]").filter((entry: any) => entry.txId === tx.id);
    setAuditLog(log);
  };

  const addNote = () => {
    if (!detailsTx || !note.trim()) return;
    // Save note to transaction (in localStorage)
    const txs = JSON.parse(localStorage.getItem("transactions") || "[]");
    const updated = txs.map((tx: any) => tx.id === detailsTx.id ? { ...tx, note: (tx.note || "") + `\n${note.trim()}` } : tx);
    localStorage.setItem("transactions", JSON.stringify(updated));
    // Add to audit log
    const log = JSON.parse(localStorage.getItem("audit_log") || "[]");
    log.push({ txId: detailsTx.id, action: "note", note: note.trim(), admin: user?.username, timestamp: new Date().toISOString() });
    localStorage.setItem("audit_log", JSON.stringify(log));
    setNote("");
    setAuditLog(log.filter((entry: any) => entry.txId === detailsTx.id));
    loadTransactions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-white shadow-sm border-b mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Falcon Fraud Admin</span>
            <Badge variant="outline" className="ml-2">Admin</Badge>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="flex items-center text-gray-700"><User className="h-5 w-5 mr-1" />{user.username}</span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center"><LogOut className="h-4 w-4 mr-1" />Logout</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and review transactions flagged by AI fraud detection</p>
        </div>

        {/* FILTERS SECTION */}
        <Card className="mb-8 shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-900">
              <Search className="h-5 w-5 text-blue-500" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                <div className="relative">
                  <input type="date" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} className="border rounded px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-200" />
                  <span className="absolute right-2 top-2.5 text-gray-400 pointer-events-none"><CalendarIcon /></span>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Risk Level</label>
                <select value={filter.risk} onChange={e => setFilter(f => ({ ...f, risk: e.target.value }))} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200">
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-gray-600 mb-1">User/Account</label>
                <div className="flex items-center border rounded px-3 py-2 bg-white text-sm focus-within:ring-2 focus-within:ring-blue-200">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <input type="text" placeholder="Account or User" value={filter.user} onChange={e => setFilter(f => ({ ...f, user: e.target.value }))} className="outline-none w-32 bg-transparent" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* ANALYTICS SECTION */}
        <Card className="mb-8 shadow-md border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-green-900">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Analytics & Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FraudAnalytics transactions={filteredTransactions} />
          </CardContent>
        </Card>
        {/* BULK ACTIONS SECTION */}
        <Card className="mb-4 shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-indigo-900">
              <CheckCircle className="h-5 w-5 text-indigo-500" />
              Bulk Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={() => handleBulkAction('approve')}>Approve Selected</Button>
              <Button variant="destructive" size="sm" disabled={selected.length === 0} onClick={() => handleBulkAction('reject')}>Reject Selected</Button>
              {selected.length > 0 && <span className="text-xs text-gray-500 ml-2">{selected.length} selected</span>}
            </div>
          </CardContent>
        </Card>
        {/* TRANSACTION TABLE SECTION */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-purple-900">
              <Activity className="h-5 w-5 text-purple-500" />
              Transaction Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full border rounded-lg">
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead><input type="checkbox" checked={selected.length === paginatedTransactions.length && paginatedTransactions.length > 0} onChange={handleSelectAll} /></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className={selected.includes(transaction.id) ? "bg-blue-50" : ""}>
                      <TableCell><input type="checkbox" checked={selected.includes(transaction.id)} onChange={() => handleSelectRow(transaction.id)} /></TableCell>
                      <TableCell className="font-mono text-xs">{transaction.timestamp ? transaction.timestamp.split('T')[0] : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{transaction.senderAccount || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>${transaction.amount}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeColor(transaction.riskLevel || '')}>
                          {transaction.riskLevel ? transaction.riskLevel.charAt(0).toUpperCase() + transaction.riskLevel.slice(1) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip content="Risk score (0-1)">
                          <span className="font-mono text-xs">{transaction.riskScore !== undefined ? transaction.riskScore.toFixed(2) : '-'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(transaction.status)}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${transaction.id}`}
                              checked={transaction.status === 'approved'}
                              onChange={() => handleTransactionAction(transaction.id, 'approve')}
                              className="accent-green-600"
                            />
                            <span className="text-xs text-green-700">Approve</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${transaction.id}`}
                              checked={transaction.status === 'rejected'}
                              onChange={() => handleTransactionAction(transaction.id, 'reject')}
                              className="accent-red-600"
                            />
                            <span className="text-xs text-red-700">Reject</span>
                          </label>
                          <Tooltip content="View Details">
                            <Button variant="outline" size="icon" onClick={() => openDetails(transaction)}><Info className="h-4 w-4 text-blue-600" /></Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Transaction Details Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {detailsTx && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-semibold">ID:</span> {detailsTx.id}</div>
                  <div><span className="font-semibold">Date:</span> {detailsTx.timestamp ? detailsTx.timestamp.split('T')[0] : '-'}</div>
                  <div><span className="font-semibold">Sender:</span> {detailsTx.senderAccount}</div>
                  <div><span className="font-semibold">Beneficiary:</span> {detailsTx.beneficiaryAccount}</div>
                  <div><span className="font-semibold">Amount:</span> ${detailsTx.amount}</div>
                  <div><span className="font-semibold">Channel:</span> {detailsTx.channel}</div>
                  <div><span className="font-semibold">Risk Level:</span> {detailsTx.riskLevel}</div>
                  <div><span className="font-semibold">Risk Score:</span> {detailsTx.riskScore !== undefined ? detailsTx.riskScore.toFixed(2) : '-'}</div>
                  <div><span className="font-semibold">Status:</span> {detailsTx.status}</div>
                </div>
                <div>
                  <span className="font-semibold">Notes:</span>
                  <div className="bg-gray-100 rounded p-2 min-h-[40px] whitespace-pre-line">{detailsTx.note || 'No notes yet.'}</div>
                  <div className="flex gap-2 mt-2">
                    <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." className="flex-1" />
                    <Button size="sm" onClick={addNote} disabled={!note.trim()}>Add Note</Button>
                  </div>
                </div>
                <div>
                  <span className="font-semibold">Audit Trail:</span>
                  <ul className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto text-xs">
                    {auditLog.length === 0 && <li className="text-gray-400">No actions yet.</li>}
                    {auditLog.map((entry, idx) => (
                      <li key={idx} className="mb-1">
                        <span className="font-semibold">[{entry.timestamp.split('T')[0]}]</span> {entry.admin} <span className="text-blue-600">{entry.action}</span> {entry.note && <span className="italic">- {entry.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
