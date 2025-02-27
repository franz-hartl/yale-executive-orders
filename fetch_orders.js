// Script to fetch financial executive orders from the Federal Register
const { writeFileSync } = require('fs');
const https = require('https');

// Function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Making request to: ${url}`);
    https.get(url, (res) => {
      console.log(`Response status code: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Request completed, received ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`Request error: ${err.message}`);
      reject(err);
    });
  });
}

// Function to determine the president based on order data
function determinePresident(order) {
  // If the president name is available, use it
  if (order.president?.name) {
    return order.president.name;
  }
  
  // For orders after January 20, 2025, set to Trump
  const pubDate = new Date(order.publication_date);
  const signingDate = order.signing_date ? new Date(order.signing_date) : null;
  const cutoffDate = new Date('2025-01-20');
  
  if (pubDate >= cutoffDate || (signingDate && signingDate >= cutoffDate)) {
    return "Trump";
  }
  
  // For orders between Jan 20, 2021 and Jan 20, 2025, set to Biden
  const bidenStartDate = new Date('2021-01-20');
  const trumpStartDate = new Date('2025-01-20');
  
  if ((pubDate >= bidenStartDate && pubDate < trumpStartDate) || 
      (signingDate && signingDate >= bidenStartDate && signingDate < trumpStartDate)) {
    return "Biden";
  }
  
  // Default to Unknown if we can't determine the president
  return "Unknown";
}

// Function to fetch all executive orders since a specific date
async function fetchExecutiveOrders() {
  try {
    // Get all executive orders published since January 20, 2025
    // Get a comprehensive collection of executive orders
    
    let allOrders = [];
    let currentPage = 1;
    const perPage = 50; // Maximum allowed by the API
    let hasMorePages = true;
    
    // Step 1: First, get ALL executive orders from Jan 20, 2025 onwards
    console.log("Fetching ALL executive orders from January 20, 2025 onwards...");
    
    const fromDate = "2025-01-20";
    while (hasMorePages) {
      console.log(`Fetching page ${currentPage} of executive orders...`);
      const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpresidential_document_type%5D=executive_order&conditions%5Bpublication_date%5D%5Bgte%5D=${fromDate}&per_page=${perPage}&page=${currentPage}&order=newest`;
      
      const response = await makeRequest(url);
      const data = JSON.parse(response);
      
      if (data.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} results on page ${currentPage}`);
        
        for (const order of data.results) {
          // Check if this order is already in our collection
          if (!allOrders.some(o => o.document_number === order.document_number)) {
            console.log(`Adding new order: ${order.executive_order_number || 'N/A'} - ${order.title}`);
            
            // Get the full text of the executive order
            let fullText = '';
            try {
              if (order.body_html_url) {
                const bodyResponse = await makeRequest(order.body_html_url);
                // Extract text content from HTML
                fullText = bodyResponse.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              }
            } catch (error) {
              console.error(`Error fetching full text for order ${order.executive_order_number}:`, error.message);
            }
            
            // Add relevant fields to our collection
            allOrders.push({
              document_number: order.document_number,
              title: order.title,
              publication_date: order.publication_date,
              signing_date: order.signing_date,
              executive_order_number: order.executive_order_number,
              president: determinePresident(order),
              url: order.html_url,
              summary: order.abstract || order.description || "No summary available",
              full_text: fullText || order.abstract || order.description || "No full text available"
            });
          } else {
            console.log(`Skipping duplicate: ${order.executive_order_number || 'N/A'} - ${order.title}`);
          }
        }
        
        // Check if there are more pages
        if (data.next_page_url) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }
    
    // Step 2: Now search for additional executive orders to ensure comprehensive coverage
    // Removing financial-specific filters to get all executive orders
    console.log("Searching for additional executive orders...");
    const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpresidential_document_type%5D=executive_order&per_page=100&order=newest`;
    
    const response = await makeRequest(url);
    console.log(`Response from additional search:`, response.substring(0, 200) + '...');
    const data = JSON.parse(response);
    
    if (data.results) {
      // Filter out duplicates and add to our collection
      console.log(`Found ${data.results.length} results from additional search`);
      for (const order of data.results) {
        // Check if this order is already in our collection
        if (!allOrders.some(o => o.document_number === order.document_number)) {
          console.log(`Adding new order: ${order.executive_order_number || 'N/A'} - ${order.title}`);
          
          // Get the full text of the executive order
          let fullText = '';
          try {
            if (order.body_html_url) {
              const bodyResponse = await makeRequest(order.body_html_url);
              // Extract text content from HTML
              fullText = bodyResponse.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
          } catch (error) {
            console.error(`Error fetching full text for order ${order.executive_order_number}:`, error.message);
          }
          
          // Add relevant fields to our collection
          allOrders.push({
            document_number: order.document_number,
            title: order.title,
            publication_date: order.publication_date,
            signing_date: order.signing_date,
            executive_order_number: order.executive_order_number,
            president: order.president?.name || "Unknown",
            url: order.html_url,
            summary: order.abstract || order.description || "No summary available",
            full_text: fullText || order.abstract || order.description || "No full text available"
          });
        } else {
          console.log(`Skipping duplicate: ${order.executive_order_number || 'N/A'} - ${order.title}`);
        }
      }
    }
    
    // Sort by date (newest first)
    allOrders.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    
    // Save as JSON
    writeFileSync('executive_orders.json', JSON.stringify(allOrders, null, 2));
    
    // Create CSV content
    let csvContent = "Executive Order Number,Title,Signing Date,Publication Date,President,URL\n";
    for (const order of allOrders) {
      csvContent += `${order.executive_order_number || 'N/A'},"${order.title.replace(/"/g, '""')}",${order.signing_date || 'N/A'},${order.publication_date || 'N/A'},${order.president || 'N/A'},${order.url || 'N/A'}\n`;
    }
    
    // Save as CSV
    writeFileSync('executive_orders.csv', csvContent);
    
    console.log(`Successfully fetched ${allOrders.length} executive orders.`);
    console.log('Data saved to executive_orders.json and executive_orders.csv');
  } catch (error) {
    console.error('Error fetching executive orders:', error);
    console.error('Error details:', error.stack);
  }
}

// Run the main function
fetchExecutiveOrders();
