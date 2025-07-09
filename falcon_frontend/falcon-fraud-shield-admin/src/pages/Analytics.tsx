import React, { useEffect, useState } from "react";
import { FraudAnalytics } from "@/components/FraudAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Table } from '@/components/ui/table';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '350px' };
const mapCenter = { lat: 20.5937, lng: 78.9629 };

const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // <-- Replace with your actual API key

const Analytics = () => {
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [timeTrends, setTimeTrends] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topBeneficiaries, setTopBeneficiaries] = useState<any[]>([]);
  const [geoTxns, setGeoTxns] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  // Google Maps loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    fetchAllTransactions();
    fetchTimeTrends();
    fetchTopUsers();
    fetchTopBeneficiaries();
    fetchGeoTxns();
    fetchAuditLog();
  }, []);

  const fetchAllTransactions = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/all-transactions");
      if (response.ok) {
        const txs = await response.json();
        setAllTransactions(
          txs.map((tx: any) => ({
            ...tx,
            riskScore: tx.risk_score,
            riskLevel:
              tx.risk_score >= 0.7 ? "high" :
              tx.risk_score >= 0.4 ? "medium" : "low",
            channel: tx.details?.channel || "Unknown",
            amount: tx.amount
          }))
        );
      }
    } catch (error) {}
  };

  const fetchTimeTrends = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics/time-trends");
      if (res.ok) setTimeTrends(await res.json());
    } catch {}
  };
  const fetchTopUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics/top-risky-users");
      if (res.ok) setTopUsers(await res.json());
    } catch {}
  };
  const fetchTopBeneficiaries = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics/top-risky-beneficiaries");
      if (res.ok) setTopBeneficiaries(await res.json());
    } catch {}
  };
  const fetchGeoTxns = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/analytics/geo");
      if (res.ok) setGeoTxns(await res.json());
    } catch {}
  };
  const fetchAuditLog = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/audit-log");
      if (res.ok) setAuditLog(await res.json());
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-blue-900 flex items-center gap-2">
              <span role="img" aria-label="analytics">📊</span> Fraud Analytics & Insights
            </CardTitle>
            <p className="text-gray-600 mt-2">Visualize risk levels, channel trends, and risk score distributions for all transactions.</p>
          </CardHeader>
          <CardContent>
            <FraudAnalytics transactions={allTransactions} />
          </CardContent>
        </Card>

        {/* Time-based Risk Trends */}
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-blue-800">Risk Score Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" label={{ value: 'Avg Risk', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Txn Count', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="avg_risk_score" stroke="#8884d8" name="Avg Risk Score" />
                <Line yAxisId="right" type="monotone" dataKey="txn_count" stroke="#82ca9d" name="Txn Count" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Risky Users & Beneficiaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-red-700">Top Risky Users</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="high_risk_count" />
                  <YAxis type="category" dataKey="user_name" />
                  <Tooltip />
                  <Bar dataKey="high_risk_count" fill="#ef4444" name="High Risk Txns" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-yellow-700">Top Risky Beneficiaries</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topBeneficiaries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="high_risk_count" />
                  <YAxis type="category" dataKey="beneficiary_account" />
                  <Tooltip />
                  <Bar dataKey="high_risk_count" fill="#f59e0b" name="High Risk Txns" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Geo Map of Risky Transactions (Google Maps) */}
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-green-700">Geo Map of Risky Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 350, width: '100%' }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={5}
                >
                  {geoTxns.map((txn: any) => (
                    <Marker
                      key={txn.id}
                      position={{ lat: Number(txn.lat), lng: Number(txn.lon) }}
                      title={`Txn ID: ${txn.id}\nUser: ${txn.user_id}\nAmount: ₹${txn.amount}\nRisk Score: ${txn.risk_score}\nStatus: ${txn.status}\nDate: ${new Date(txn.created_at).toLocaleString()}`}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div>Loading Map...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-indigo-700">Admin Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Admin</th>
                    <th>Txn ID</th>
                    <th>Amount</th>
                    <th>Action</th>
                    <th>Note</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log: any) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.admin_name}</td>
                      <td>{log.transaction_id}</td>
                      <td>₹{log.amount}</td>
                      <td>{log.action}</td>
                      <td>{log.note}</td>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics; 