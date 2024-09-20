const queryInput = document.getElementById('query');
const searchButton = document.getElementById('but');
const tableBody = document.getElementById('table-body');

searchButton.addEventListener('click', async () => {
    console.log("jamal");
    
    const query = queryInput.value;

    if (query) {
        console.log(query);
        console.log( typeof query);
        
        try {
            
            const response = await fetch(`http://localhost:3000/search?term=${query}`);
            const data = await response.json();
                console.log(data);
                
            tableBody.innerHTML = '';

            if (data.length > 0) {
                console.log(data);
                
                data.forEach(result => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${result.page || 'N/A'}</td>
                        <td>${result['Company Name'] || 'N/A'}</td>
                        <td>${result['Phone Number'] || 'N/A'}</td>
                        <td>${result.Email || 'N/A'}</td>
                        <td>${result.City || 'N/A'}</td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="5">No results found</td>`;
                tableBody.appendChild(row);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        alert('Please enter a search term.');
    }
});
