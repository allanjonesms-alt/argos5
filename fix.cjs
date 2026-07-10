const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const target = `    function isMaster() {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'MASTER';
    }

    function isAdmin() {
      return isAuthenticated() &&
        (isMaster() || 
         (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
          'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
          (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN' || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SUPERVISOR_DE_OPERACOES')) || 
         (request.auth != null && 'token' in request.auth && 'email' in request.auth.token && request.auth.token.email == "allanjonesms@gmail.com" && 'email_verified' in request.auth.token && request.auth.token.email_verified == true));
    }

    function isForcaTatica() {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        (('unidade' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.unidade == 'FORÇA TÁTICA') || 
         ('unidades_extras' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data && 
          'FORÇA TÁTICA' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.unidades_extras));
    }

    function getUserUnidade() {
      return (isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 'unidade' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data)
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data.unidade
        : '';
    }`;

const replacement = `    function getUserDoc() {
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
    }`;

fs.writeFileSync('firestore.rules', content.replace(target, replacement));
