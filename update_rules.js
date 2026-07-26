const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const target = `    function isAdmin() {
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
    }

    function isMaster() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'MASTER';
    }`;

const replacement = `    function getUserDoc() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data : null;
    }

    function isMaster() {
      let docData = getUserDoc();
      return isAuthenticated() && docData != null && 'role' in docData && docData.role == 'MASTER';
    }

    function isAdmin() {
      let docData = getUserDoc();
      let hasAdminRole = docData != null && 'role' in docData && (docData.role == 'ADMIN' || docData.role == 'SUPERVISOR_DE_OPERACOES');
      let isGmailAdmin = request.auth != null && request.auth.token != null && request.auth.token.email == "allanjonesms@gmail.com";
      return isAuthenticated() && (isMaster() || hasAdminRole || isGmailAdmin);
    }

    function isForcaTatica() {
      let docData = getUserDoc();
      return isAuthenticated() && docData != null && (
        ('unidade' in docData && docData.unidade == 'FORÇA TÁTICA') || 
        ('unidades_extras' in docData && 'FORÇA TÁTICA' in docData.unidades_extras)
      );
    }

    function getUserUnidade() {
      let docData = getUserDoc();
      return (isAuthenticated() && docData != null && 'unidade' in docData) ? docData.unidade : '';
    }`;

rules = rules.replace(target, replacement);
fs.writeFileSync('firestore.rules', rules);
