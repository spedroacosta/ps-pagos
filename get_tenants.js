fetch('http://localhost:3000/api/superadmin/tenants', {
  headers: {
    'Authorization': 'Bearer ADMIN_SECRET'
  }
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
