const notFoundHandler = (req, res, next) => {
    const message = "The requested resource was not found";
    res.status(404).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: "Route not found" }), // Optional stack info in dev mode
    });
  };
  
  export default notFoundHandler;
  