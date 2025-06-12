import React, { useState, useEffect, useCallback } from 'react';

// Define the structure for an LST data object
interface LSTData {
  name: string;
  mintAddress: string;
  website: string;
  currentAPY: string;
  sevenDayAvgAPY: string;
  thirtyDayAvgAPY: string; // Added new property for 30-day average APY
}

// List of Liquid Staking Tokens (LSTs) on Solana with their mint addresses and websites
const lsts = [
  {
    name: 'JitoSOL',
    mintAddress: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    website: 'https://www.jito.network/',
  },
  {
    name: 'mSOL',
    mintAddress: 'mSoLzYCxHdYgdzU16g5K3z3KZK7ytfqcJm7So',
    website: 'https://marinade.finance/',
  },
  {
    name: 'JupSOL',
    mintAddress: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v',
    website: 'https://jup.ag/stake-sol',
  },
  {
    name: 'dSOL',
    mintAddress: 'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ',
    website: 'https://drift.trade/',
  },
  {
    name: 'bnSOL',
    mintAddress: 'BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85',
    website: 'https://www.binance.com/en/solana-staking',
  },
  // pSOL removed as requested
];

// Main App component
const App: React.FC = () => {
  const [lstData, setLstData] = useState<LSTData[]>([]); // State to store LST data
  const [loading, setLoading] = useState<boolean>(true); // State for loading indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [sortColumn, setSortColumn] = useState<keyof LSTData | null>(null); // State for current sorting column
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // State for sorting order

  /**
   * Fetches APY data for a given LST from the Kamino Finance API.
   * Calculates current APY and 7-day average APY.
   * @param lst The LST object containing name, mintAddress, and website.
   * @returns A promise that resolves to an LSTData object, or null if fetching fails.
   */
  const fetchLSTAPY = useCallback(async (lst: { name: string; mintAddress: string; website: string }): Promise<LSTData | null> => {
    try {
      const now = new Date();
      // Calculate 7 days ago timestamp for historical data
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Calculate 30 days ago timestamp for historical data
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);


      // Kamino Finance API endpoint for historical staking yields (for 7-day average)
      const apiUrl7Day = `https://api.kamino.finance/staking-yields/tokens/${lst.mintAddress}/history?start=${sevenDaysAgo.toISOString()}&end=${now.toISOString()}`;
      // Kamino Finance API endpoint for historical staking yields (for 30-day average)
      const apiUrl30Day = `https://api.kamino.finance/staking-yields/tokens/${lst.mintAddress}/history?start=${thirtyDaysAgo.toISOString()}&end=${now.toISOString()}`;

      const [response7Day, response30Day] = await Promise.all([
        fetch(apiUrl7Day),
        fetch(apiUrl30Day)
      ]);

      if (!response7Day.ok) {
        throw new Error(`Failed to fetch 7-day data for ${lst.name}: ${response7Day.statusText}`);
      }
      if (!response30Day.ok) {
        throw new Error(`Failed to fetch 30-day data for ${lst.name}: ${response30Day.statusText}`);
      }

      const data7Day = await response7Day.json();
      const data30Day = await response30Day.json();


      let currentAPY = 'N/A';
      let sevenDayAvgAPY = 'N/A';
      let thirtyDayAvgAPY = 'N/A';

      if (data7Day && data7Day.length > 0) {
        data7Day.sort((a: any, b: any) => new Date(a.endBlockTime).getTime() - new Date(b.endBlockTime).getTime());
        currentAPY = (parseFloat(data7Day[data7Day.length - 1].apy) * 100).toFixed(2) + '%';
        const totalAPY7Day = data7Day.reduce((sum: number, entry: any) => sum + parseFloat(entry.apy), 0);
        sevenDayAvgAPY = (totalAPY7Day / data7Day.length * 100).toFixed(2) + '%';
      } else {
        console.warn(`No 7-day APY data found for ${lst.name} (${lst.mintAddress})`);
      }

      if (data30Day && data30Day.length > 0) {
        // No need to sort again if data is already sorted by date, but good practice if fetching independently
        data30Day.sort((a: any, b: any) => new Date(a.endBlockTime).getTime() - new Date(b.endBlockTime).getTime());
        const totalAPY30Day = data30Day.reduce((sum: number, entry: any) => sum + parseFloat(entry.apy), 0);
        thirtyDayAvgAPY = (totalAPY30Day / data30Day.length * 100).toFixed(2) + '%';
      } else {
        console.warn(`No 30-day APY data found for ${lst.name} (${lst.mintAddress})`);
      }

      return {
        ...lst,
        currentAPY,
        sevenDayAvgAPY,
        thirtyDayAvgAPY,
      };
    } catch (err) {
      console.error(`Error fetching data for ${lst.name}:`, err);
      return {
        ...lst,
        currentAPY: 'Error',
        sevenDayAvgAPY: 'Error',
        thirtyDayAvgAPY: 'Error',
      };
    }
  }, []);

  /**
   * Fetches all LST data concurrently.
   */
  const fetchAllLSTData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(lsts.map(fetchLSTAPY));
      // Filter out any null results from failed fetches
      const validResults = results.filter((result): result is LSTData => result !== null);
      setLstData(validResults);
    } catch (err) {
      setError('Failed to fetch LST data. Please try again later.');
      console.error('Error in fetchAllLSTData:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchLSTAPY]);

  // Handle column header clicks for sorting
  const handleSort = (column: keyof LSTData) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, set it as the sort column and default to ascending
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  // Sort the LST data based on current sortColumn and sortOrder
  const sortedLstData = [...lstData].sort((a, b) => {
    if (sortColumn === null) return 0; // No sorting applied initially

    if (sortColumn === 'name') {
      // Use localeCompare for proper alphabetical sorting
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortColumn === 'currentAPY' || sortColumn === 'sevenDayAvgAPY' || sortColumn === 'thirtyDayAvgAPY') {
      // Parse numerical values, treating 'N/A' or 'Error' as 0 for sorting purposes
      const aValue = parseFloat(a[sortColumn].replace('%', '')) || 0;
      const bValue = parseFloat(b[sortColumn].replace('%', '')) || 0;

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  // Initial data fetch on component mount
  useEffect(() => {
    fetchAllLSTData();

    // Set up automatic refresh every 10 minutes (600,000 milliseconds)
    const intervalId = setInterval(fetchAllLSTData, 10 * 60 * 1000); // 10 minutes

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchAllLSTData]);

  // Determine the LST with the highest current APY for highlighting (from the potentially sorted data)
  const highestAPYTokenName = sortedLstData.reduce((highestName, currentItem) => {
    const currentAPYNum = parseFloat(currentItem.currentAPY.replace('%', ''));
    const highestAPYNum = parseFloat(
      sortedLstData.find((item) => item.name === highestName)?.currentAPY.replace('%', '') || '0'
    );

    if (!isNaN(currentAPYNum) && currentAPYNum > highestAPYNum) {
      return currentItem.name;
    }
    return highestName;
  }, '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 md:p-8 border border-purple-200">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-8 tracking-tight">
          Solana Liquid Staking Token (LST) APY Comparison
        </h1>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            <p className="ml-4 text-lg text-gray-600">Fetching latest APY data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {!loading && lstData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th
                    className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-purple-700 transition-colors duration-200"
                    onClick={() => handleSort('name')}
                  >
                    LST{' '}
                    {sortColumn === 'name' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th
                    className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-purple-700 transition-colors duration-200"
                    onClick={() => handleSort('currentAPY')}
                  >
                    Current APY{' '}
                    {sortColumn === 'currentAPY' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th
                    className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-purple-700 transition-colors duration-200"
                    onClick={() => handleSort('sevenDayAvgAPY')}
                  >
                    7-Day Avg APY{' '}
                    {sortColumn === 'sevenDayAvgAPY' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th
                    className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider cursor-pointer hover:bg-purple-700 transition-colors duration-200"
                    onClick={() => handleSort('thirtyDayAvgAPY')}
                  >
                    30-Day Avg APY{' '}
                    {sortColumn === 'thirtyDayAvgAPY' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedLstData.map((lst) => ( // Use sortedLstData here
                  <tr
                    key={lst.mintAddress}
                    className={`
                      ${lst.name === highestAPYTokenName ? 'bg-yellow-50 border-l-4 border-yellow-500 shadow-md' : 'hover:bg-gray-50'}
                      transition duration-200 ease-in-out
                    `}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <a
                        href={lst.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 hover:text-purple-900 font-medium text-lg flex items-center"
                      >
                        {lst.name}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1 text-purple-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-7 7m7-7v6"
                          />
                        </svg>
                      </a>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-700 font-semibold">
                      {lst.currentAPY}
                      {lst.name === highestAPYTokenName && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                          Highest!
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                      {lst.sevenDayAvgAPY}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                      {lst.thirtyDayAvgAPY}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && lstData.length === 0 && !error && (
          <p className="text-center text-gray-600 text-lg mt-8">
            No data available. Please check your internet connection or try again later.
          </p>
        )}

        <p className="text-center text-sm text-gray-500 mt-8">
          Data refreshes automatically every 10 minutes. Click on column headers to sort.
        </p>
      </div>
    </div>
  );
};

export default App;
