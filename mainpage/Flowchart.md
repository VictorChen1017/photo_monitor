
```{mermaid}
graph TD
    A[index.php] --> B{Router}
    B -- GET /user --> C[UserController.php]
    B -- POST /login --> D[AuthController.php]
    C --> E[UserModel.php]
    E --> F[(Database)]

```
