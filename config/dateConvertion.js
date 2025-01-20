export const convertDateToMonthAndYear = (date) =>{
    const  newDate = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' , day: 'numeric' });
    return formatter.format(newDate);
 
 }
