// test-task-creation.ts

// This script will test our '/create-task' endpoint.

// 1. We define the sample data for the new task we want to create.
const newTaskData = {
  title: 'Test the Backend API',
  description: 'Make sure the create-task endpoint works.',
  deadline: '2025-12-31T23:59:00Z', // ISO 8601 is a standard format for dates.
  staked_amount: '0.5', // Sending as a string, just as your code expects.
  userAddress: '0xAbCd1234EfGh5678IjKl9012MnOp3456QrSt7890'
};

// 2. This is the main function that runs our test.
// We use `async` because network requests are asynchronous (they take time).
async function testCreateTaskEndpoint() {
  console.log('🧪 Starting test: Attempting to create a new task...');

  try {
    // 3. We use `fetch` to send an HTTP request to our server.
    // This is exactly what a frontend application would do.
    const response = await fetch('http://localhost:3000/create-task', {
      method: 'POST', // We use 'POST' because we are creating new data.
      headers: {
        'Content-Type': 'application/json', // Tells the server we are sending data in JSON format.
      },
      body: JSON.stringify(newTaskData), // Converts our JavaScript object into a JSON string for sending.
    });

    // 4. We wait for the server's response and parse it as JSON.
    const responseData = await response.json();

    // 5. We check if the request was successful.
    // `response.ok` is true for HTTP status codes in the 200-299 range.
    if (response.ok) {
      console.log('✅ Test PASSED! Server responded with success.');
      console.log('Server Response:', responseData);
    } else {
      console.error('❌ Test FAILED! Server responded with an error.');
      console.error('Status Code:', response.status);
      console.error('Error Details:', responseData);
    }
  } catch (error) {
    console.error('❌ Test FAILED! Could not connect to the server.');
    console.error('Error:', error);
    console.log('👉 Tip: Is your backend server running? Start it with `pnpm tsx src/index.ts`');
  }
}

// 6. Finally, we call the function to run the test.
testCreateTaskEndpoint();