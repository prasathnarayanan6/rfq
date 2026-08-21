import axios from "axios";
import APP_URL from "./config";
function LoginAPI(userData){
    const result = axios.post(APP_URL+'/api/v1/login', userData);
    return result;
}
export default LoginAPI;