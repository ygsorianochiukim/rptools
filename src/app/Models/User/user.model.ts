export interface User {
    s_bpartner_employee_id?: number,
    firstname?: string,
    lastname?: string,
    birthdate?: Date,
    sex?: string,
    contact_no?: number,
    companyname?: string,
    address?: string,
    email?: string,
    username?: string,
    password?: string,
    is_active?: boolean,
    OTP?: number,
    sss_no?: number,
    tin_no?: number,
    hdmf_no?: number,
    phic_no?: number,
    user_access?: {
        position?: position | null;
        function?: position | null;
    }
}

export interface position{
    department?: string,
    function?: string,
    position?: string,

}
