import { useState, useEffect } from 'react';
import { Download, FileText, DollarSign, TrendingUp, CreditCard, Wallet, Globe, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { FilterBar } from '../components/dashboard/FilterBar';
import { StatusChip } from '../components/dashboard/StatusChip';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { TableSkeleton } from '../components/dashboard/LoadingState';
import { mockBillingRecords } from '../data/mockData';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentMethod, PaymentMethodStats } from '../types';

export default function Billing() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);

  const filteredRecords = mockBillingRecords.filter((record) => {
    if (currentTenant && record.tenantId !== currentTenant.id) return false;
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (paymentMethodFilter !== 'all' && record.paymentMethod !== paymentMethodFilter) return false;
    if (
      searchValue &&
      !record.invoiceNumber.toLowerCase().includes(searchValue.toLowerCase()) &&
      !record.stationName.toLowerCase().includes(searchValue.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate payment method statistics
  const calculatePaymentMethodStats = (): PaymentMethodStats[] => {
    const methods: PaymentMethod[] = ['rfid_card', 'cib', 'epayment'];
    const totalRevenue = filteredRecords
      .filter(r => r.status !== 'refund')
      .reduce((sum, r) => sum + r.amount, 0);

    return methods.map(method => {
      const methodRecords = filteredRecords.filter(r => r.paymentMethod === method);
      const methodRevenue = methodRecords
        .filter(r => r.status !== 'refund')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const totalTransactions = methodRecords.filter(r => r.status !== 'refund').length;
      const failedTransactions = methodRecords.filter(r => r.failed === true).length;
      const successfulTransactions = totalTransactions - failedTransactions;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
      
      const avgProcessingTime = methodRecords.length > 0
        ? methodRecords.reduce((sum, r) => sum + (r.processingTime || 0), 0) / methodRecords.length
        : 0;

      return {
        method,
        totalRevenue: methodRevenue,
        percentage: totalRevenue > 0 ? (methodRevenue / totalRevenue) * 100 : 0,
        successRate,
        failedCount: failedTransactions,
        avgProcessingTime,
        transactionCount: totalTransactions,
      };
    });
  };

  const paymentMethodStats = calculatePaymentMethodStats();

  // Get payment method label and icon
  const getPaymentMethodInfo = (method: PaymentMethod) => {
    const info = {
      rfid_card: { label: 'Carte RFID', icon: CreditCard, color: '#8b5cf6' },
      cib: { label: 'CIB / BaridiMob', icon: Wallet, color: '#f59e0b' },
      epayment: { label: 'E-payment', icon: Globe, color: '#3b82f6' },
    };
    return info[method];
  };

  // Check for problematic payment methods (success rate < 85%)
  const problematicMethods = paymentMethodStats.filter(stat => stat.successRate < 85 && stat.transactionCount > 0);

  const summary = filteredRecords.reduce(
    (acc, record) => {
      acc.totalRevenue += record.amount;
      acc.totalSessions += record.sessions;
      acc.totalEnergy += record.energyKwh;
      if (record.status === 'paid') acc.paidAmount += record.amount;
      if (record.status === 'unpaid') acc.unpaidAmount += record.amount;
      if (record.status === 'refund') acc.refundAmount += Math.abs(record.amount);
      return acc;
    },
    {
      totalRevenue: 0,
      totalSessions: 0,
      totalEnergy: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      refundAmount: 0,
    }
  );
  const billableAmount = summary.paidAmount + summary.unpaidAmount;
  const paidRate = billableAmount > 0 ? (summary.paidAmount / billableAmount) * 100 : 0;
  const unpaidRate = billableAmount > 0 ? (summary.unpaidAmount / billableAmount) * 100 : 0;
  const collectionRate = billableAmount > 0 ? (summary.paidAmount / billableAmount) * 100 : 0;
  const refundRate = billableAmount > 0 ? (summary.refundAmount / billableAmount) * 100 : 0;

  const handleExport = (format: 'pdf' | 'csv') => {
    toast.success(`Exporting billing data as ${format.toUpperCase()}...`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Billing & Reports</h1>
          <p className="text-gray-500 mt-1">Revenue tracking and invoice management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.totalRevenue.toLocaleString()} DZD
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">
              {summary.paidAmount.toLocaleString()} DZD
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {paidRate.toFixed(1)}% of billable amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4 text-yellow-600" />
              Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-yellow-600">
              {summary.unpaidAmount.toLocaleString()} DZD
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {unpaidRate.toFixed(1)}% of billable amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-orange-600">
              {summary.refundAmount.toLocaleString()} DZD
            </p>
            <p className="text-xs text-gray-500 mt-1">Refunded amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner for Problematic Payment Methods */}
      {problematicMethods.length > 0 && (
        <Alert variant="destructive" className="border-l-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Method Issues Detected:</strong>{' '}
            {problematicMethods.map((stat, idx) => {
              const info = getPaymentMethodInfo(stat.method);
              return (
                <span key={stat.method}>
                  {info.label} has {stat.successRate.toFixed(1)}% success rate ({stat.failedCount} failed transactions)
                  {idx < problematicMethods.length - 1 ? ', ' : '.'}
                </span>
              );
            })}
            {' '}Check connectivity and system status.
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Method Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paymentMethodStats.map(stat => {
          const info = getPaymentMethodInfo(stat.method);
          const Icon = info.icon;
          const isProblematic = stat.successRate < 85 && stat.transactionCount > 0;
          const isHealthy = stat.successRate >= 95;

          return (
            <Card 
              key={stat.method}
              className={`border-2 ${isProblematic ? 'border-red-200 bg-red-50/30' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: info.color }} />
                    {info.label}
                  </CardTitle>
                  {isProblematic && (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  {isHealthy && stat.transactionCount > 0 && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Revenue */}
                <div>
                  <p className="text-2xl font-semibold" style={{ color: info.color }}>
                    {stat.totalRevenue.toLocaleString()} DZD
                  </p>
                  <p className="text-xs text-gray-500">
                    {stat.percentage.toFixed(1)}% of total revenue
                  </p>
                </div>

                {/* Success Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Success Rate</span>
                    <span 
                      className={`text-xs font-semibold ${
                        isProblematic ? 'text-red-600' : isHealthy ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {stat.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isProblematic ? 'bg-red-500' : isHealthy ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${stat.successRate}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Transactions</p>
                    <p className="text-sm font-semibold">{stat.transactionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className={`text-sm font-semibold ${isProblematic ? 'text-red-600' : ''}`}>
                      {stat.failedCount}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <p className="text-xs text-gray-500">Avg. Processing</p>
                    </div>
                    <p className="text-sm font-semibold">{stat.avgProcessingTime.toFixed(2)}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing Records Table */}
      <Card>
        <FilterBar
          searchPlaceholder="Search by invoice or station..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'Paid', value: 'paid' },
                { label: 'Unpaid', value: 'unpaid' },
                { label: 'Refund', value: 'refund' },
              ],
              onChange: setStatusFilter,
            },
            {
              label: 'Payment Method',
              value: paymentMethodFilter,
              options: [
                { label: 'All', value: 'all' },
                { label: 'Carte RFID', value: 'rfid_card' },
                { label: 'CIB / BaridiMob', value: 'cib' },
                { label: 'E-payment', value: 'epayment' },
              ],
              onChange: setPaymentMethodFilter,
            },
          ]}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Energy (kWh)</TableHead>
                <TableHead>Amount (DZD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton cols={9} />
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No billing records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => {
                  const methodInfo = getPaymentMethodInfo(record.paymentMethod);
                  const MethodIcon = methodInfo.icon;

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <span className="font-mono text-sm">{record.invoiceNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{record.stationName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MethodIcon 
                            className="h-4 w-4" 
                            style={{ color: methodInfo.color }}
                          />
                          <span className="text-sm">{methodInfo.label}</span>
                          {record.failed && (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{format(record.date, 'MMM dd, yyyy')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.sessions}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{record.energyKwh.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            record.amount < 0 ? 'text-red-600' : ''
                          }`}
                        >
                          {record.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={record.status} type="payment" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.success(`Opening invoice ${record.invoiceNumber}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="border-t bg-muted/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredRecords.length} invoice(s)
            </span>
            <div className="flex gap-6">
              <div>
                <span className="text-gray-600">Total Energy: </span>
                <span className="font-semibold">
                  {summary.totalEnergy.toLocaleString()} kWh
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Amount: </span>
                <span className="font-semibold">
                  {summary.totalRevenue.toLocaleString()} DZD
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Reconciliation Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Collection Rate</p>
              <p className="text-2xl font-semibold">
                {collectionRate.toFixed(1)}
                %
              </p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${collectionRate}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Outstanding Amount</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {summary.unpaidAmount.toLocaleString()} DZD
              </p>
              <p className="text-xs text-gray-500">Pending collection</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Refund Rate</p>
              <p className="text-2xl font-semibold text-orange-600">
                {refundRate.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">Total refunded</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
