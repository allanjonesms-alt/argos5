const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/function isMaster\(\) \{[\s\S]*?function isOwner/g, `function getUserDoc() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data : null;
    }

    function isMaster() {
      let doc = getUserDoc();
      return isAuthenticated() && doc != null && 'role' in doc && doc.role == 'MASTER';
    }

    function isAdmin() {
      let doc = getUserDoc();
      let hasAdminRole = doc != null && 'role' in doc && (doc.role == 'ADMIN' || doc.role == 'SUPERVISOR_DE_OPERACOES');
      let isGmailAdmin = request.auth != null && request.auth.token != null && 'email' in request.auth.token && request.auth.token.email == "allanjonesms@gmail.com";
      return isAuthenticated() && (isMaster() || hasAdminRole || isGmailAdmin);
    }

    function isForcaTatica() {
      let doc = getUserDoc();
      return isAuthenticated() && doc != null && (
        ('unidade' in doc && doc.unidade == 'FORÇA TÁTICA') || 
        ('unidades_extras' in doc && 'FORÇA TÁTICA' in doc.unidades_extras)
      );
    }

    function getUserUnidade() {
      let doc = getUserDoc();
      return (isAuthenticated() && doc != null && 'unidade' in doc) ? doc.unidade : '';
    }

    function isOwner`);
fs.writeFileSync('firestore.rules', content);
