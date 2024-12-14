interface ManagerCoreCommsServiceInterface {
    sendCommandToCore: (jsonString: string) => void;
  }
  
  const ManagerCoreCommsService: ManagerCoreCommsServiceInterface = {
    sendCommandToCore: (jsonString: string) => {
      // iOS mock implementation
      console.warn("ManagerCoreCommsService is not available on iOS. Command:", jsonString);
    }
  };
  
  export default ManagerCoreCommsService;