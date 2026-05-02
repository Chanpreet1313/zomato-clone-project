import mongoose from "mongoose";
export async function connectdb(url){
  return mongoose.connect(url); 
}