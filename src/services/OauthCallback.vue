<template>
  <div>
    <p>Finishing authentication...</p>
  </div>
</template>

<script>
const authBase = "http://localhost:8000/";
export default {
  mounted() {
    // Process OAuth callback here
    const code = this.$route.query.code; // Get OAuth code from query parameter
    const authCookie = this.getCookie('vn_auth_sessid'); // Get auth cookie

    if (authCookie) {
      this.authenticateWithCookie(authCookie);
    } else if (code) {
      this.authenticateWithCode(code);
    } else {
      console.error('No code or cookie found in callback');
    }
  },
  methods: {
    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    },
    authenticateWithCookie(authCookie) {
      fetch(authBase + 'api/v1/login', {
        headers: {
          'Authorization': 'Bearer ' + authCookie,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        // Handle response
      })
      .catch(error => {
        // Handle error
      });
    },
    authenticateWithCode(code) {
      fetch(authBase + 'api/v1/login', {
        method: "POST",
        headers: {
          'X-Auth-Init': code,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        // Handle response
      })
      .catch(error => {
        // Handle error
      });
    }
  }
}
</script>
